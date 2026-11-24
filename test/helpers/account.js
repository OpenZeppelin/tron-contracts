const { ethers } = require('hardhat');
const { impersonateAccount, setBalance } = require('@nomicfoundation/hardhat-network-helpers');

// Hardhat default balance was 10000 * WeiPerEther = 1e22 wei. Under
// the TVM bridge's 1-wei-==-1-sun pass-through model (see
// plugin/cheatcodes.js top-of-file), account balances are bounded by
// Java Long.MAX_VALUE (~9.22e18 sun). 10000 ETH-equivalent overflows;
// 5 ETH-equivalent (5e18 sun) leaves headroom and is still
// 1000-100000× any realistic per-test consumption.
const DEFAULT_BALANCE = 5n * ethers.WeiPerEther;

const impersonate = (account, balance = DEFAULT_BALANCE) => {
  const address = account.target ?? account.address ?? account;
  return impersonateAccount(address)
    .then(() => setBalance(address, balance))
    .then(() => ethers.getSigner(address));
};

module.exports = {
  impersonate,
};
