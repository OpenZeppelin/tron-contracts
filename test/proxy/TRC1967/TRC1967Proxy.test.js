const { ethers } = require('hardhat');

const shouldBehaveLikeProxy = require('../Proxy.behaviour');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const fixture = async () => {
  const [nonContractAddress] = await ethers.getSigners();

  const implementation = await ethers.deployContract('DummyImplementation');

  return { nonContractAddress, implementation };
};

describe('TRC1967Proxy', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  describe('(default) allowUninitialized is false', function () {
    before(function () {
      this.createProxy = (implementation, initData, opts) =>
        ethers.deployContract('TRC1967Proxy', [implementation, initData], opts);
    });

    shouldBehaveLikeProxy(false);
  });

  describe('(unsafe) allowUninitialized is true', function () {
    before(function () {
      this.createProxy = (implementation, initData, opts) =>
        ethers.deployContract('TRC1967ProxyUnsafe', [implementation, initData], opts);
    });

    shouldBehaveLikeProxy(true);
  });
});
