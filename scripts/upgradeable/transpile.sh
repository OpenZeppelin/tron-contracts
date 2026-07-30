#!/usr/bin/env bash

set -euo pipefail -x

VERSION="$(jq -r .version contracts/package.json)"
DIRNAME="$(dirname -- "${BASH_SOURCE[0]}")"

bash "$DIRNAME/patch-apply.sh"
# Portable in-place edit. `sed -i'' -e ...` is GNU-only: on macOS/BSD sed, `-i`
# consumes the next arg (`-e`) as the backup SUFFIX, leaving a stray
# `contracts/package.json-e` that `git add contracts` then commits. Round-trip
# through a temp file instead so it behaves identically on GNU and BSD sed.
sed "s/<package-version>/$VERSION/g" "contracts/package.json" > "contracts/package.json.tmp"
mv "contracts/package.json.tmp" "contracts/package.json"
git add contracts/package.json

# The transpiler only reads the solc AST + storage layout (it never touches
# TVM bytecode), so transpilation is VM-agnostic. Compile with stock solc
# under `--network hardhat`: hardhat.config.js routes the tron-solc pipeline
# ONLY to tron networks (see tre.compiler.target), and stock solc has no wasm
# memory ceiling, so the entire corpus lands in a SINGLE build-info.
#
# The default `npm run compile` runs `tron:compile-batches`, which splits the
# corpus into ~14 passes (one build-info each) to dodge the tron-solc wasm
# limit — but the transpiler requires exactly one build-info. SKIP_EXPOSED
# keeps hardhat-exposed `$`-wrappers out of the build.
rm -rf artifacts cache
SKIP_EXPOSED=1 npx hardhat compile --network hardhat

build_info=($(jq -r '.input.sources | keys | if any(test("^contracts/mocks/.*\\bunreachable\\b")) then empty else input_filename end' artifacts/build-info/*))
build_info_num=${#build_info[@]}

if [ $build_info_num -ne 1 ]; then
  echo "found $build_info_num relevant build info files but expected just 1"
  exit 1
fi

# -D: delete original and excluded files
# -b: use this build info file
# -i: use included Initializable
# -x: exclude some proxy-related contracts
# -p: emit public initializer
# -n: use namespaces
# -N: exclude from namespaces transformation
# -q: peer-project (partial) transpilation. Stateless code (interfaces,
#     libraries, Initializable) is NOT renamed — it is emitted as imports from
#     the peer package `@openzeppelin/tron-contracts` (resolved via the
#     lib/tron-contracts submodule + remappings.txt). This is what keeps the
#     output structurally identical to openzeppelin-contracts-upgradeable: only
#     STATEFUL contracts get the `Upgradeable` suffix, so the unmodified test
#     suite (which deploys e.g. `$Checkpoints`) still resolves via the
#     hardhat/env-artifacts.js suffix shim. The value is a path prefix
#     prepended to each peer source's solc path (e.g. contracts/utils/Math.sol
#     -> @openzeppelin/tron-contracts/contracts/utils/Math.sol); it does NOT
#     depend on how our contracts import each other (relative imports to peer
#     files are rewritten to peer imports automatically).
npx @openzeppelin/upgrade-safe-transpiler -D \
  -b "$build_info" \
  -i contracts/proxy/utils/Initializable.sol \
  -x 'contracts-exposed/**/*' \
  -x 'contracts/mocks/**/*Proxy*.sol' \
  -x 'contracts/proxy/**/*Proxy*.sol' \
  -x 'contracts/proxy/beacon/UpgradeableBeacon.sol' \
  -p 'contracts/access/manager/AccessManager.sol' \
  -p 'contracts/finance/VestingWallet.sol' \
  -p 'contracts/governance/TimelockController.sol' \
  -p 'contracts/metatx/TRC2771Forwarder.sol' \
  -n \
  -N 'contracts/mocks/**/*' \
  -q '@openzeppelin/tron-contracts/'

# In peer mode the transpiler does NOT emit a local Initializable.sol /
# UUPSUpgradeable.sol (it references them from the peer). Copy the alias stubs,
# which re-export those two from the peer package, into the output so they
# resolve under contracts/proxy/utils/.
cp "$DIRNAME"/alias/*.sol contracts/proxy/utils/.

# Split the monolithic hardhat-exposed `contracts/mocks/WithInit.sol` (one
# `*WithInit` constructor variant per initializable contract → ~190 contracts,
# whole-corpus import closure) into closure-bounded files under
# contracts/mocks/withinit/. The single file's closure blows the tron-solc
# 0.8.26 wasm memory ceiling, so `npm run compile` (tron:compile-batches) cannot
# compile it in one pass. Idempotent + a no-op if the file is absent / already
# split. See the script header for details.
node "$DIRNAME/split-withinit.js"

# Swap in the upgradeable-variant README. The source repo's README describes the
# non-upgradeable package; the transpiled output is a different package
# (`@openzeppelin/tron-contracts-upgradeable`) and needs its own landing doc
# (peer-dependency model, initializer/namespaced-storage usage, etc.). Kept as a
# template alongside the transpiler scripts rather than patched so it stays easy
# to edit.
cp "$DIRNAME/root-readme.md" README.md
git add README.md

# The transpiler reprints Solidity from the AST, so its output is not guaranteed
# to match our Prettier config — which fails the `lint` job on the transpiled
# (-upgradeable) repo. Format the generated sources in place so the output lints
# clean. Only contracts/ is transpiled (test/ is copied verbatim and already
# formatted), and this matches the `{contracts}` half of `npm run lint:sol`.
npx prettier --log-level warn --ignore-path .gitignore --write 'contracts/**/*.sol'

# delete compilation artifacts of vanilla code
rm -rf artifacts cache
