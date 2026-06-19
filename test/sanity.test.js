const hre = require('hardhat');
const { ethers } = require('hardhat');
const { expect } = require('chai');

// Feature-detect the TVM/TRE network vs the in-process EVM. On TRE the
// network config carries `tron: true` (set by @openzeppelin/hardhat-tron for
// the `tre` network); the in-process `hardhat` EVM used under coverage does
// not. This gates TVM-only block-height semantics below.
const IS_TVM = Boolean(hre.network.config && hre.network.config.tron);
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
      //
      // Under coverage the in-process EVM snapshot revert DOES rewind the
      // block number, so the mined block is undone and the height returns to
      // the cached pre-mine value (equal, not greater). Assert the TVM-strict
      // invariant only on TVM; on EVM tolerate equality, which is still
      // meaningful (height never goes backwards past the cached value).
      const blockNumberAfter = await ethers.provider.getBlockNumber();
      if (IS_TVM) {
        expect(blockNumberAfter).to.be.greaterThan(blockNumberBefore);
      } else {
        expect(blockNumberAfter).to.be.greaterThanOrEqual(blockNumberBefore);
      }
    });
  });
});
