const { ethers } = require('hardhat');
const { impersonateAccount, setBalance } = require('@nomicfoundation/hardhat-network-helpers');

// Tron default balance (1 TRX = 1e6 sun; TVM stores account balance as a Java long)
const DEFAULT_BALANCE = 10000n * 10n ** 6n;

const impersonate = (account, balance = DEFAULT_BALANCE) => {
  const address = account.target ?? account.address ?? account;
  return impersonateAccount(address)
    .then(() => setBalance(address, balance))
    .then(() => ethers.getSigner(address));
};

module.exports = {
  impersonate,
};
