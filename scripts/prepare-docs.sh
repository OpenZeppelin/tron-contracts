#!/usr/bin/env bash

set -euo pipefail
shopt -s globstar

OUTDIR="$(node -p 'require("./docs/config.js").outputDir')"

if [ ! -d node_modules ]; then
  npm ci
fi

rm -rf "$OUTDIR"

# The docs only need the compiler's AST and NatSpec output, not TVM bytecode.
# `hardhat docgen` always compiles first (it has no --no-compile), and on the
# default `tre` network that compile goes through the tron-solc 0.8.26 wasm
# build, which runs out of memory on the whole corpus in a single pass (the
# reason `npm run compile` is batched). Compile under the stock-solc pipeline
# instead: `--network hardhat` leaves the tron pipeline inactive
# (`tre.compiler.target` is `tron-when-network-tron`) and Hardhat then uses a
# native solc binary with no wasm memory ceiling. SKIP_EXPOSED keeps
# hardhat-exposed from generating and compiling the `$` wrappers, which are
# never documented.
SKIP_EXPOSED=1 hardhat docgen --network hardhat

# copy examples and adjust imports
examples_source_dir="contracts/mocks/docs"
examples_target_dir="docs/modules/api/examples"

for f in "$examples_source_dir"/**/*.sol; do
  name="${f/#"$examples_source_dir"/}"
  mkdir -p "$examples_target_dir/$(dirname "$name")"
  sed -Ee '/^import/s|"(\.\./)+|"@openzeppelin/tron-contracts/|' "$f" > "$examples_target_dir/$name"
done

node scripts/gen-nav.js "$OUTDIR" > "$OUTDIR/../nav.adoc"
