#!/usr/bin/env bash

set -euo pipefail -x

VERSION="$(jq -r .version contracts/package.json)"
DIRNAME="$(dirname -- "${BASH_SOURCE[0]}")"

bash "$DIRNAME/patch-apply.sh"
sed -i'' -e "s/<package-version>/$VERSION/g" "contracts/package.json"
git add contracts/package.json

# The transpiler only reads the solc AST + storage layout (it never touches
# TVM bytecode), so transpilation is VM-agnostic. Compile with stock solc
# under `--network hardhat`: hardhat.config.js routes the tron-solc pipeline
# ONLY to tron networks (see tre.compiler.target), and stock solc has no wasm
# memory ceiling, so the entire corpus lands in a SINGLE build-info.
#
# The default `npm run compile` runs `tron:compile-batches`, which splits the
# corpus into ~13 passes (one build-info each) to dodge the tron-solc wasm
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
#
# NOTE: OZ also passes `-q '@openzeppelin/'` to enable peer-project (partial)
# transpilation, pulling stateless code (interfaces, libraries, Initializable)
# from the published @openzeppelin/contracts package instead of re-emitting it.
# Our contracts import each other via RELATIVE paths, so nothing matches that
# prefix and `-q` would be a no-op. We therefore transpile SELF-CONTAINED:
# every contract — including interfaces and libraries — is emitted into this
# package with the `Upgradeable` suffix, with no dependency on a peer package.
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
  -p 'contracts/metatx/ERC2771Forwarder.sol' \
  -n \
  -N 'contracts/mocks/**/*'

# NOTE: OZ copies alias/ stubs here that re-export Initializable and
# UUPSUpgradeable from the @openzeppelin/contracts peer package. In our
# self-contained build the transpiler already emits a real Initializable.sol
# (via -i) and UUPSUpgradeable.sol, so copying the peer stubs would overwrite
# them with imports of a package we don't depend on. Skipped.

# delete compilation artifacts of vanilla code
rm -rf artifacts cache
