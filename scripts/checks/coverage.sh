#!/usr/bin/env bash

set -euo pipefail

export COVERAGE=true
export FOUNDRY_FUZZ_RUNS=10

. scripts/set-max-old-space-size.sh

# Hardhat coverage
hardhat coverage

# Foundry coverage compiles the Solidity test suite (test/**/*.t.sol), which
# imports the non-upgradeable contract paths directly (contracts/token/TRC20/
# TRC20.sol, …) and cannot build against the transpiled -upgradeable tree — the
# same reason the tests-foundry job is skipped there. Skip it for the
# -upgradeable package; the Hardhat coverage above still runs.
is_upgradeable="$(node -e "try{process.stdout.write(require('./contracts/package.json').name.endsWith('-upgradeable')?'1':'0')}catch(e){process.stdout.write('0')}")"

if [ "${CI:-"false"}" == "true" ] && [ "$is_upgradeable" != "1" ]; then
  # Foundry coverage
  forge coverage --report lcov --ir-minimum
  # Remove zero hits
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' '/,0/d' lcov.info
  else
    sed -i '/,0/d' lcov.info
  fi
fi

# Reports are then uploaded to Codecov automatically by workflow, and merged.
