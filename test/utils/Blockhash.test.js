const { ethers, network } = require('hardhat');
const { expect } = require('chai');
const { loadFixture, mineUpTo, setCode } = require('@nomicfoundation/hardhat-network-helpers');

const BLOCKHASH_SERVE_WINDOW = 256;
const HISTORY_SERVE_WINDOW = 8191;
// TIP-2935 history storage contract; identical to EIP-2935's address.
const HISTORY_STORAGE_ADDRESS = '0x0000F90827F1C53a10cb7A02335B175320002935';

async function fixture() {
  const mock = await ethers.deployContract('$Blockhash');
  // On the in-process Hardhat EVM the history storage address is occupied by a placeholder that reverts with
  // `EIP2935 is not supported in Hardhat yet` (NomicFoundation/hardhat#6226). That is neither the canonical
  // TIP-2935 contract (which reverts with empty data out of range) nor an unconfigured network (empty code), so
  // its revert payload would come back as the queried hash. Clear it — mirroring upstream's `setCode(eip2935,
  // '0x')` for its unsupported-chain case — to exercise the library's graceful-degradation path. The TVM node
  // has no such placeholder, and `hardhat_setCode` is not part of the TRE surface, so skip it there.
  if (!network.config.tron) {
    await setCode(HISTORY_STORAGE_ADDRESS, '0x');
  }
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

  // Beyond the 8191-block history window the library returns zero. The single-witness TVM has no fast
  // block-number jump, so advancing 8191 blocks costs minutes; and while the history contract is inactive (as on
  // both CI networks) this is anyway identical to the beyond-native-window case above. Run it on the EVM only,
  // where mining is instant, to cover the upper bound of the window.
  (network.config.tron ? it.skip : it)('block beyond the history window', async function () {
    // fast forward (more than history serve window): even an active history contract no longer holds the hash,
    // so the library returns zero.
    await mineUpTo(this.latestBlock.number + HISTORY_SERVE_WINDOW + 10);
    await expect(this.mock.$blockHash(this.latestBlock.number)).to.eventually.equal(ethers.ZeroHash);
  });

  it('future block', async function () {
    await expect(this.mock.$blockHash(this.latestBlock.number + 10)).to.eventually.equal(ethers.ZeroHash);
  });
});
