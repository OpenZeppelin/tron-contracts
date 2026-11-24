const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { WebAuthnSigningKey, P256SigningKey } = require('../../../helpers/signers');

const encodeKey = pub => ethers.concat([pub.qx, pub.qy]);

async function fixture() {
  const signer = WebAuthnSigningKey.random();
  const key = encodeKey(signer.publicKey);
  const mock = await ethers.deployContract('$TRC7913WebAuthnVerifier');
  const verifyMagic = mock.interface.getFunction('verify').selector;
  return { signer, key, mock, verifyMagic };
}

describe('TRC7913WebAuthnVerifier', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    this.hash = ethers.hexlify(ethers.randomBytes(0x20));
    this.signature = this.signer.sign(this.hash).serialized;
  });

  it('accepts a valid WebAuthn assertion', async function () {
    expect(await this.mock.verify(this.key, this.hash, this.signature)).to.equal(this.verifyMagic);
  });

  it('rejects an assertion over a different challenge', async function () {
    const otherHash = ethers.hexlify(ethers.randomBytes(0x20));
    expect(await this.mock.verify(this.key, otherHash, this.signature)).to.equal('0xffffffff');
  });

  it('rejects an assertion verified against a different key', async function () {
    const otherKey = encodeKey(WebAuthnSigningKey.random().publicKey);
    expect(await this.mock.verify(otherKey, this.hash, this.signature)).to.equal('0xffffffff');
  });

  it('rejects a key that is not 0x40 bytes', async function () {
    const shortKey = ethers.dataSlice(this.key, 0, 0x3f);
    expect(await this.mock.verify(shortKey, this.hash, this.signature)).to.equal('0xffffffff');
  });

  it('rejects a bare P256 (r || s) signature that is not a WebAuthnAuth encoding', async function () {
    const { r, s } = P256SigningKey.random().sign(this.hash);
    const raw = ethers.concat([r, s]);
    expect(await this.mock.verify(this.key, this.hash, raw)).to.equal('0xffffffff');
  });

  it('rejects a malformed signature', async function () {
    expect(await this.mock.verify(this.key, this.hash, '0xdeadbeef')).to.equal('0xffffffff');
  });

  it('requires user verification', async function () {
    await expect(this.mock.$_requireUV()).to.eventually.be.true;
  });
});
