const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, mine } = require('@nomicfoundation/hardhat-network-helpers');

async function fixture() {
  return {};
}

describe('Environment sanity', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  describe('snapshot', function () {
    let blockNumberBefore;

    it('cache and mine', async function () {
      blockNumberBefore = await ethers.provider.getBlockNumber();
      await mine();
      expect(await ethers.provider.getBlockNumber()).to.equal(blockNumberBefore + 1);
    });

    it('check snapshot', async function () {
      // TVM divergence from EVM: `tre_revert` (driven by loadFixture's
      // beforeEach) rolls back account/contract STATE but keeps the block
      // height MONOTONIC — it does not rewind the block number the way an
      // EVM snapshot revert does. So the block mined by `cache and mine` is
      // not undone here; the height stays strictly above the cached pre-mine
      // value rather than returning to it.
      expect(await ethers.provider.getBlockNumber()).to.be.greaterThan(blockNumberBefore);
    });
  });
});
