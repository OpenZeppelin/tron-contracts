const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { MAX_UINT64 } = require('../../../helpers/constants');

const TEST_MESSAGE = ethers.id('OpenZeppelin');
const MESSAGE_HASH = ethers.hashMessage(TEST_MESSAGE);

async function fixture() {
  // A single arbitrary signer (>= 20 bytes) and threshold 1 is enough: the malformed-encoding cases
  // below fail while decoding the outer payload, before any signer is inspected.
  const signer = ethers.Wallet.createRandom().address;
  const mock = await ethers.deployContract('$MultiSignerTRC7913', [[signer], 1]);
  return { mock };
}

describe('MultiSignerTRC7913', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  describe('returns false (does not revert) on malformed outer encoding', function () {
    const word = v => ethers.zeroPadValue(ethers.toBeHex(v), 0x20);
    const encode = (...items) => ethers.concat(items.map(word));

    it('supports minimal encoding', async function () {
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, encode(0, 0))).to.eventually.be.false;
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, encode(0x20, 0))).to.eventually.be.false;
    });

    it('shorter than the minimum head layout (64 bytes)', async function () {
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, '0xdeadbeef')).to.eventually.be.false;
    });

    it('offset points past the calldata', async function () {
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, encode(0xffff, 0xffff, 0, 0))).to.eventually.be
        .false;
    });

    it('offset near type(uint256).max (would overflow in checked arithmetic)', async function () {
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, encode(ethers.MaxUint256, ethers.MaxUint256, 0, 0)))
        .to.eventually.be.false;
    });

    it('array length exceeds Solidity dynamic-array cap (2**64-1)', async function () {
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, encode(0x40, 0x60, MAX_UINT64 + 1n, 0))).to
        .eventually.be.false;
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, encode(0x40, 0x60, 0, MAX_UINT64 + 1n))).to
        .eventually.be.false;
    });

    it('array length exceeds the remaining buffer', async function () {
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, encode(0x40, 0x60, 10, 0))).to.eventually.be.false;
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, encode(0x40, 0x60, 0, 10))).to.eventually.be.false;
    });
  });
});
