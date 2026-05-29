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

    // TVM port: skipped. This asserts the block number rolls BACK to the
    // pre-`cache and mine` value after the next `loadFixture` revert — an
    // EVM assumption. The patched FullNode.jar deliberately keeps the block
    // number MONOTONIC through tre_revert (account/contract state rolls back,
    // height does not — see the spike's time-warp-snapshot.test.js, which
    // asserts the opposite: `blockAfter == blockBefore + 1`). The spike has
    // no EVM-style block-rollback sanity test for this reason.
    it.skip('check snapshot', async function () {
      expect(await ethers.provider.getBlockNumber()).to.equal(blockNumberBefore);
    });
  });
});
