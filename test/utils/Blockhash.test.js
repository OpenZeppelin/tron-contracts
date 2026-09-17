const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, mineUpTo } = require('@nomicfoundation/hardhat-network-helpers');

const BLOCKHASH_SERVE_WINDOW = 256;
// TIP-2935 history storage contract; identical to EIP-2935's address.
const HISTORY_STORAGE_ADDRESS = '0x0000F90827F1C53a10cb7A02335B175320002935';

async function fixture() {
  const mock = await ethers.deployContract('$Blockhash');
  // TIP-2935 activates per network through the `ALLOW_TVM_PRAGUE` chain parameter. Probe whether the history
  // storage contract is deployed on the current network so the beyond-window assertion can expect the real
  // hash where it is active and zero (graceful degradation) where it is not.
  const historyActive = (await ethers.provider.getCode(HISTORY_STORAGE_ADDRESS)) !== '0x';
  return { mock, historyActive };
}

describe('Blockhash', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    // Capture fresh per test: on TVM, `tre_revert` keeps the block
    // number monotonic, so a fixture-cached `latestBlock` would go
    // stale across tests and `latest + N` would no longer be future.
    this.latestBlock = await ethers.provider.getBlock('latest');
  });

  it('recent block', async function () {
    // fast forward (less than blockhash serve window): served by the native `BLOCKHASH` opcode
    await mineUpTo(this.latestBlock.number + BLOCKHASH_SERVE_WINDOW);
    await expect(this.mock.$blockHash(this.latestBlock.number)).to.eventually.equal(this.latestBlock.hash);
  });

  it('block beyond the native window', async function () {
    // fast forward (more than blockhash serve window): the library falls back to the TIP-2935 history storage,
    // which returns the real hash where the history contract is active and zero where it is not.
    await mineUpTo(this.latestBlock.number + BLOCKHASH_SERVE_WINDOW + 1);
    await expect(this.mock.$blockHash(this.latestBlock.number)).to.eventually.equal(
      this.historyActive ? this.latestBlock.hash : ethers.ZeroHash,
    );
  });

  it('future block', async function () {
    await expect(this.mock.$blockHash(this.latestBlock.number + 10)).to.eventually.equal(ethers.ZeroHash);
  });
});
