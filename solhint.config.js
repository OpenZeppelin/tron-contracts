const customRules = require('solhint-plugin-openzeppelin');

// The `-upgradeable` variant is produced by the transpiler, not hand-written, so
// a handful of our style rules simply do not apply to its generated output:
//   - func-name-mixedcase  : initializer functions are named `__X_init[_unchained]`
//   - const-name-snakecase : ERC-7201 slots are `<Name>StorageLocation`
//   - no-global-import     : the generated hardhat-exposed `WithInit_*` mocks pull
//                            in whole modules with bare `import "..."`
//   - imports-on-top       : peer imports are added mid-file in multi-contract mocks
//   - duplicated-imports   : ditto, across the split `WithInit_*` mock files
// Detect that build (its package is renamed `*-upgradeable`) and disable those
// rules there only; the non-upgradeable source repo keeps every rule as an error.
let upgradeable = false;
try {
  upgradeable = require('./contracts/package.json').name.endsWith('-upgradeable');
} catch {
  // contracts/package.json may be absent (e.g. a partial checkout); stay strict.
}

const disabledForUpgradeable = upgradeable
  ? ['func-name-mixedcase', 'const-name-snakecase', 'no-global-import', 'imports-on-top', 'duplicated-imports']
  : [];

const rules = [
  'avoid-tx-origin',
  'const-name-snakecase',
  'contract-name-capwords',
  'event-name-capwords',
  'max-states-count',
  'explicit-types',
  'func-name-mixedcase',
  'func-param-name-mixedcase',
  'imports-on-top',
  'modifier-name-mixedcase',
  'no-console',
  'no-global-import',
  'no-unused-vars',
  'quotes',
  'use-forbidden-name',
  'var-name-mixedcase',
  'visibility-modifier-order',
  'interface-starts-with-i',
  'duplicated-imports',
  ...customRules.map(r => `openzeppelin/${r.ruleId}`),
].filter(r => !disabledForUpgradeable.includes(r));

module.exports = {
  plugins: ['openzeppelin'],
  rules: Object.fromEntries(rules.map(r => [r, 'error'])),
};
