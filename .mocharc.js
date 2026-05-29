module.exports = {
  require: 'hardhat/register',
  // TVM deploys are slow; match the `mocha.timeout` in hardhat.config.js
  // (the upstream OZ 4s default is impossible on TRE). This file only
  // applies when mocha is invoked directly; `hardhat test` uses the
  // hardhat.config.js mocha block.
  timeout: 600000,
};
