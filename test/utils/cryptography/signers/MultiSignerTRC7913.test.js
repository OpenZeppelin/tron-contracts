const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { MAX_UINT64 } = require('../../../helpers/constants');

const TEST_MESSAGE = ethers.id('OpenZeppelin');
const MESSAGE_HASH = ethers.hashMessage(TEST_MESSAGE);

// ECDSA signers for the management/validation suites (their 20-byte address is the ERC-7913 key).
const signerECDSA1 = ethers.Wallet.createRandom();
const signerECDSA2 = ethers.Wallet.createRandom();
const signerECDSA3 = ethers.Wallet.createRandom();
const signerECDSA4 = ethers.Wallet.createRandom(); // unauthorized

const sortSigners = signers =>
  signers.sort((a, b) =>
    Buffer.compare(
      ethers.getBytes(ethers.keccak256(a.address ?? a)),
      ethers.getBytes(ethers.keccak256(b.address ?? b)),
    ),
  );
const prepareMultisig = (signers, signatures) =>
  ethers.AbiCoder.defaultAbiCoder().encode(['bytes[]', 'bytes[]'], [signers.map(s => s.address ?? s), signatures]);

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

  describe('signer management', function () {
    beforeEach(async function () {
      this.mock = await ethers.deployContract('$MultiSignerTRC7913', [[signerECDSA1.address, signerECDSA2.address], 1]);
    });

    it('can add signers', async function () {
      await expect(this.mock.$_addSigners([signerECDSA3.address]))
        .to.emit(this.mock, 'TRC7913SignerAdded')
        .withArgs(signerECDSA3.address);
      await expect(this.mock.isSigner(signerECDSA3.address)).to.eventually.be.true;
      await expect(this.mock.$_addSigners([signerECDSA3.address]))
        .to.be.revertedWithCustomError(this.mock, 'MultiSignerTRC7913AlreadyExists')
        .withArgs(signerECDSA3.address.toLowerCase());
    });

    it('can remove signers', async function () {
      await expect(this.mock.$_removeSigners([signerECDSA2.address]))
        .to.emit(this.mock, 'TRC7913SignerRemoved')
        .withArgs(signerECDSA2.address);
      await expect(this.mock.isSigner(signerECDSA2.address)).to.eventually.be.false;
      await expect(this.mock.$_removeSigners([signerECDSA2.address]))
        .to.be.revertedWithCustomError(this.mock, 'MultiSignerTRC7913NonexistentSigner')
        .withArgs(signerECDSA2.address.toLowerCase());
      // removing the last reachable signer would make the threshold unreachable
      await expect(this.mock.$_removeSigners([signerECDSA1.address]))
        .to.be.revertedWithCustomError(this.mock, 'MultiSignerTRC7913UnreachableThreshold')
        .withArgs(0, 1);
    });

    it('can change the threshold', async function () {
      await expect(this.mock.$_setThreshold(2)).to.emit(this.mock, 'TRC7913ThresholdSet').withArgs(2);
      await expect(this.mock.$_setThreshold(3))
        .to.be.revertedWithCustomError(this.mock, 'MultiSignerTRC7913UnreachableThreshold')
        .withArgs(2, 3);
      await expect(this.mock.$_setThreshold(0)).to.be.revertedWithCustomError(
        this.mock,
        'MultiSignerTRC7913ZeroThreshold',
      );
    });

    it('rejects an invalid signer format', async function () {
      await expect(this.mock.$_addSigners(['0x123456']))
        .to.be.revertedWithCustomError(this.mock, 'MultiSignerTRC7913InvalidSigner')
        .withArgs('0x123456');
    });

    it('can read signers and threshold', async function () {
      await expect(
        this.mock.getSigners(0, MAX_UINT64).then(a => a.map(ethers.getAddress)),
      ).to.eventually.have.deep.members([signerECDSA1.address, signerECDSA2.address]);
      await expect(this.mock.threshold()).to.eventually.equal(1);
    });

    it('checks whether an address is a signer', async function () {
      await expect(this.mock.isSigner(signerECDSA1.address)).to.eventually.be.true;
      await expect(this.mock.isSigner(signerECDSA3.address)).to.eventually.be.false;
    });
  });

  describe('signature validation (2 signers, threshold 2)', function () {
    beforeEach(async function () {
      this.mock = await ethers.deployContract('$MultiSignerTRC7913', [[signerECDSA1.address, signerECDSA2.address], 2]);
    });

    it('accepts signatures from authorized signers', async function () {
      const signers = sortSigners([signerECDSA1, signerECDSA2]);
      const signatures = await Promise.all(signers.map(s => s.signMessage(TEST_MESSAGE)));
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, prepareMultisig(signers, signatures))).to.eventually
        .be.true;
    });

    it('rejects signatures from unauthorized signers', async function () {
      const signers = sortSigners([signerECDSA1, signerECDSA4]);
      const signatures = await Promise.all(signers.map(s => s.signMessage(TEST_MESSAGE)));
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, prepareMultisig(signers, signatures))).to.eventually
        .be.false;
    });

    it('rejects an invalid signature from an authorized signer', async function () {
      const signers = sortSigners([signerECDSA1, signerECDSA2]);
      const signatures = await Promise.all(
        signers.map((s, i) => s.signMessage(i === 0 ? 'wrong message' : TEST_MESSAGE)),
      );
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, prepareMultisig(signers, signatures))).to.eventually
        .be.false;
    });

    it('accepts signatures from unsorted signers', async function () {
      const signers = sortSigners([signerECDSA1, signerECDSA2]).reverse();
      const signatures = await Promise.all(signers.map(s => s.signMessage(TEST_MESSAGE)));
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, prepareMultisig(signers, signatures))).to.eventually
        .be.true;
    });

    it('rejects when signers.length != signatures.length', async function () {
      const signers = sortSigners([signerECDSA1, signerECDSA2]);
      const signatures = await Promise.all(signers.slice(0, -1).map(s => s.signMessage(TEST_MESSAGE)));
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, prepareMultisig(signers, signatures))).to.eventually
        .be.false;
    });

    it('rejects duplicated signers', async function () {
      const signers = sortSigners([signerECDSA1, signerECDSA1]);
      const signatures = await Promise.all(signers.map(s => s.signMessage(TEST_MESSAGE)));
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, prepareMultisig(signers, signatures))).to.eventually
        .be.false;
    });
  });
});
