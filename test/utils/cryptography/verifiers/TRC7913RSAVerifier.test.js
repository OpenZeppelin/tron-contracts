const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { RSASHA256SigningKey } = require('../../../helpers/signers');

// key = abi.encode(bytes e, bytes n); signature = PKCS#1 v1.5 over sha256(hash) (what RSA.pkcs1Sha256 expects).
const encodeKey = pub => ethers.AbiCoder.defaultAbiCoder().encode(['bytes', 'bytes'], [pub.e, pub.n]);

async function fixture() {
  const signer = RSASHA256SigningKey.random();
  const key = encodeKey(signer.publicKey);
  const mock = await ethers.deployContract('$TRC7913RSAVerifier');
  const verifyMagic = mock.interface.getFunction('verify').selector;
  return { signer, key, mock, verifyMagic };
}

describe('TRC7913RSAVerifier', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    this.hash = ethers.hexlify(ethers.randomBytes(0x20));
    this.signature = this.signer.sign(this.hash).serialized;
  });

  it('accepts a valid RSA signature', async function () {
    expect(await this.mock.verify(this.key, this.hash, this.signature)).to.equal(this.verifyMagic);
  });

  it('rejects a signature over a different hash', async function () {
    const otherHash = ethers.hexlify(ethers.randomBytes(0x20));
    expect(await this.mock.verify(this.key, otherHash, this.signature)).to.equal('0xffffffff');
  });

  it('rejects a signature verified against a different key', async function () {
    const otherKey = encodeKey(RSASHA256SigningKey.random().publicKey);
    expect(await this.mock.verify(otherKey, this.hash, this.signature)).to.equal('0xffffffff');
  });

  it('rejects a tampered signature', async function () {
    const tampered = ethers.toBeHex(ethers.toBigInt(this.signature) ^ 1n, ethers.dataLength(this.signature));
    expect(await this.mock.verify(this.key, this.hash, tampered)).to.equal('0xffffffff');
  });
});
