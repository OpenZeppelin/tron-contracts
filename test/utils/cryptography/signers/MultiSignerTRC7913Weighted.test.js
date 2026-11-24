const { ethers } = require('hardhat');
const { expect } = require('chai');

const { MAX_UINT64 } = require('../../../helpers/constants');

const TEST_MESSAGE = 'OpenZeppelin';
const MESSAGE_HASH = ethers.hashMessage(TEST_MESSAGE);

// Prepared once; weight/threshold tests need no real crypto (ECDSA addresses as ERC-7913 keys).
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

const deployWeighted = (signers, weights, threshold) =>
  ethers.deployContract('$MultiSignerTRC7913Weighted', [signers, weights, threshold]);

describe('MultiSignerTRC7913Weighted', function () {
  const signer1 = signerECDSA1.address;
  const signer2 = signerECDSA2.address;
  const signer3 = signerECDSA3.address;
  const signer4 = signerECDSA4.address;

  describe('weight management', function () {
    beforeEach(async function () {
      this.mock = await deployWeighted([signer1, signer2, signer3], [1, 2, 3], 4);
    });

    it('can get signer weights', async function () {
      await expect(this.mock.signerWeight(signer1)).to.eventually.equal(1);
      await expect(this.mock.signerWeight(signer2)).to.eventually.equal(2);
      await expect(this.mock.signerWeight(signer3)).to.eventually.equal(3);
    });

    it('can update signer weights', async function () {
      await expect(this.mock.$_setSignerWeights([signer1, signer2], [5, 6]))
        .to.emit(this.mock, 'TRC7913SignerWeightChanged')
        .withArgs(signer1, 5)
        .to.emit(this.mock, 'TRC7913SignerWeightChanged')
        .withArgs(signer2, 6);
      await expect(this.mock.signerWeight(signer1)).to.eventually.equal(5);
      await expect(this.mock.signerWeight(signer2)).to.eventually.equal(6);
      await expect(this.mock.signerWeight(signer3)).to.eventually.equal(3);
    });

    it("no-op doesn't emit an event", async function () {
      await expect(this.mock.$_setSignerWeights([signer1], [1])).to.not.emit(this.mock, 'TRC7913SignerWeightChanged');
    });

    it('cannot set weight to a non-existent signer', async function () {
      await expect(this.mock.$_setSignerWeights([signer4], [1]))
        .to.be.revertedWithCustomError(this.mock, 'MultiSignerTRC7913NonexistentSigner')
        .withArgs(signer4.toLowerCase());
    });

    it('cannot set weight to 0', async function () {
      await expect(this.mock.$_setSignerWeights([signer1], [0]))
        .to.be.revertedWithCustomError(this.mock, 'MultiSignerTRC7913WeightedInvalidWeight')
        .withArgs(signer1.toLowerCase(), 0);
    });

    it('requires signers and weights arrays to have the same length', async function () {
      await expect(this.mock.$_setSignerWeights([signer1, signer2], [1])).to.be.revertedWithCustomError(
        this.mock,
        'MultiSignerTRC7913WeightedMismatchedLength',
      );
      await expect(this.mock.$_setSignerWeights([signer1], [1, 2])).to.be.revertedWithCustomError(
        this.mock,
        'MultiSignerTRC7913WeightedMismatchedLength',
      );
    });

    it('validates the threshold is reachable when updating weights', async function () {
      await this.mock.$_setSignerWeights([signer1, signer2, signer3], [2, 3, 4]);
      await expect(this.mock.$_setThreshold(9)).to.emit(this.mock, 'TRC7913ThresholdSet').withArgs(9);
      await expect(this.mock.$_setSignerWeights([signer1, signer2, signer3], [2, 2, 2])).to.be.revertedWithCustomError(
        this.mock,
        'MultiSignerTRC7913UnreachableThreshold',
      );
      await expect(this.mock.$_setThreshold(10))
        .to.be.revertedWithCustomError(this.mock, 'MultiSignerTRC7913UnreachableThreshold')
        .withArgs(9, 10);
    });

    it('reports a default weight of 1 for signers without an explicit weight', async function () {
      await this.mock.$_addSigners([signer4]);
      await expect(this.mock.signerWeight(signer4)).to.eventually.equal(1);
    });

    it('reports a weight of 0 for non-signers', async function () {
      await expect(this.mock.signerWeight(signer4)).to.eventually.equal(0);
    });

    it('can get the total weight of all signers', async function () {
      await expect(this.mock.totalWeight()).to.eventually.equal(6);
    });

    it('totalWeight is correct when all signers have the default weight', async function () {
      const signers = [signer1, signer2, signer3];
      const newMock = await deployWeighted(signers, [1, 1, 1], 2);
      await expect(newMock.totalWeight()).to.eventually.equal(3);
      await newMock.$_setSignerWeights(signers, [1, 1, 1]);
      await expect(newMock.totalWeight()).to.eventually.equal(3);
    });

    it('_setSignerWeights handles default weights when updating', async function () {
      await expect(this.mock.totalWeight()).to.eventually.equal(6);
      await this.mock.$_setSignerWeights([signer1], [5]);
      await expect(this.mock.totalWeight()).to.eventually.equal(10);
      await this.mock.$_setSignerWeights([signer1], [1]);
      await expect(this.mock.totalWeight()).to.eventually.equal(6);
    });

    it('updates total weight when adding and removing signers', async function () {
      await expect(this.mock.totalWeight()).to.eventually.equal(6);
      await this.mock.$_addSigners([signer4]);
      await expect(this.mock.totalWeight()).to.eventually.equal(7);
      await this.mock.$_setSignerWeights([signer4], [5]);
      await expect(this.mock.totalWeight()).to.eventually.equal(11);
      await this.mock.$_removeSigners([signer4]);
      await expect(this.mock.totalWeight()).to.eventually.equal(6);
    });

    it('removing signers must not make the threshold unreachable', async function () {
      await expect(this.mock.$_removeSigners([signer3]))
        .to.be.revertedWithCustomError(this.mock, 'MultiSignerTRC7913UnreachableThreshold')
        .withArgs(3, 4);
      await expect(this.mock.$_removeSigners([signer1]))
        .to.emit(this.mock, 'TRC7913SignerRemoved')
        .withArgs(signer1)
        .to.not.emit(this.mock, 'TRC7913SignerWeightChanged');
    });

    it('reverts if the total weight would overflow (_setSignerWeights)', async function () {
      await expect(this.mock.$_setSignerWeights([signer1, signer2, signer3], [1n, 1n, MAX_UINT64 - 1n]))
        .to.be.revertedWithCustomError(this.mock, 'SafeCastOverflowedUintDowncast')
        .withArgs(64, MAX_UINT64 + 1n);
    });

    it('reverts if the total weight would overflow (_addSigners)', async function () {
      await this.mock.$_setSignerWeights([signer1, signer2, signer3], [1n, 1n, MAX_UINT64 - 2n]);
      await expect(this.mock.totalWeight()).to.eventually.equal(MAX_UINT64);
      await expect(this.mock.$_addSigners([signer4]))
        .to.be.revertedWithCustomError(this.mock, 'SafeCastOverflowedUintDowncast')
        .withArgs(64, MAX_UINT64 + 1n);
    });
  });

  describe('weighted signature validation (threshold 3; weights 1, 2, 3)', function () {
    beforeEach(async function () {
      this.mock = await deployWeighted([signer1, signer2, signer3], [1, 2, 3], 3);
    });

    it('accepts when the combined weight meets the threshold', async function () {
      const signers = sortSigners([signerECDSA1, signerECDSA2]); // 1 + 2 = 3
      const signatures = await Promise.all(signers.map(s => s.signMessage(TEST_MESSAGE)));
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, prepareMultisig(signers, signatures))).to.eventually
        .be.true;
    });

    it('accepts a single high-weight signer that meets the threshold', async function () {
      const signers = [signerECDSA3]; // weight 3
      const signatures = await Promise.all(signers.map(s => s.signMessage(TEST_MESSAGE)));
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, prepareMultisig(signers, signatures))).to.eventually
        .be.true;
    });

    it('rejects when the combined weight is below the threshold', async function () {
      const signers = [signerECDSA1]; // weight 1 < 3
      const signatures = await Promise.all(signers.map(s => s.signMessage(TEST_MESSAGE)));
      await expect(this.mock.$_rawSignatureValidation(MESSAGE_HASH, prepareMultisig(signers, signatures))).to.eventually
        .be.false;
    });

    it('rejects an unauthorized signer', async function () {
      const signers = [signerECDSA4];
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
  });
});
