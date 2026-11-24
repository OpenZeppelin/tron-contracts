const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { WebAuthnSigningKey, P256SigningKey } = require('../../../helpers/signers');

async function fixture() {
  const signer = WebAuthnSigningKey.random();
  const mock = await ethers.deployContract('$SignerWebAuthn', [signer.publicKey.qx, signer.publicKey.qy]);
  return { signer, mock };
}

describe('SignerWebAuthn', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    this.hash = ethers.hexlify(ethers.randomBytes(0x20));
    this.signature = this.signer.sign(this.hash).serialized;
  });

  it('validates a correct WebAuthn assertion', async function () {
    await expect(this.mock.$_rawSignatureValidation(this.hash, this.signature)).to.eventually.be.true;
  });

  it('rejects an assertion over a different hash', async function () {
    const otherHash = ethers.hexlify(ethers.randomBytes(0x20));
    await expect(this.mock.$_rawSignatureValidation(otherHash, this.signature)).to.eventually.be.false;
  });

  it('rejects an assertion signed by a different key', async function () {
    const other = WebAuthnSigningKey.random();
    await expect(this.mock.$_rawSignatureValidation(this.hash, other.sign(this.hash).serialized)).to.eventually.be
      .false;
  });

  it('rejects a bare P256 signature (WebAuthn-only)', async function () {
    const { r, s } = P256SigningKey.random().sign(this.hash);
    await expect(this.mock.$_rawSignatureValidation(this.hash, ethers.concat([r, s]))).to.eventually.be.false;
  });

  it('rejects a malformed signature', async function () {
    await expect(this.mock.$_rawSignatureValidation(this.hash, '0xdeadbeef')).to.eventually.be.false;
    await expect(this.mock.$_rawSignatureValidation(this.hash, '0x')).to.eventually.be.false;
  });

  it('exposes the stored signer', async function () {
    const { qx, qy } = this.signer.publicKey;
    await expect(this.mock.signer()).to.eventually.deep.equal([qx, qy]);
  });

  it('updates the signer via _setSigner', async function () {
    const other = WebAuthnSigningKey.random();
    await this.mock.$_setSigner(other.publicKey.qx, other.publicKey.qy);
    await expect(this.mock.$_rawSignatureValidation(this.hash, other.sign(this.hash).serialized)).to.eventually.be.true;
    await expect(this.mock.$_rawSignatureValidation(this.hash, this.signature)).to.eventually.be.false;
  });

  it('rejects an invalid public key', async function () {
    await expect(this.mock.$_setSigner(ethers.ZeroHash, ethers.ZeroHash)).to.be.revertedWithCustomError(
      this.mock,
      'SignerP256InvalidPublicKey',
    );
  });
});
