const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, mineUpTo } = require('@nomicfoundation/hardhat-network-helpers');

const BLOCKHASH_SERVE_WINDOW = 256;

async function fixture() {
  return {
    mock: await ethers.deployContract('$Blockhash'),
    latestBlock: await ethers.provider.getBlock('latest'),
  };
}

describe('Blockhash', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  it('recent block', async function () {
    // fast forward (less than blockhash serve window)
    await mineUpTo(this.latestBlock.number + BLOCKHASH_SERVE_WINDOW);
    await expect(this.mock.$blockHash(this.latestBlock.number)).to.eventually.equal(this.latestBlock.hash);
  });

  it('old block', async function () {
    // fast forward (more than blockhash serve window)
    await mineUpTo(this.latestBlock.number + BLOCKHASH_SERVE_WINDOW + 1);
    await expect(this.mock.$blockHash(this.latestBlock.number)).to.eventually.equal(ethers.ZeroHash);
  });

  it('future block', async function () {
    await expect(this.mock.$blockHash(this.latestBlock.number + 10)).to.eventually.equal(ethers.ZeroHash);
  });
});
