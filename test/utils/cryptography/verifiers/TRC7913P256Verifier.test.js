const { ethers } = require('hardhat');
const { expect } = require('chai');
const { secp256r1 } = require('@noble/curves/p256');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;

// P256 signatures are malleable; ensure s is in the lower half of the curve order (matches P256.verify).
const ensureLowerOrderS = ({ s, recovery, ...rest }) => {
  if (s > N / 2n) {
    s = N - s;
    recovery = 1 - recovery;
  }
  return { s, recovery, ...rest };
};

const prepareSignature = (
  privateKey = secp256r1.utils.randomPrivateKey(),
  messageHash = ethers.hexlify(ethers.randomBytes(0x20)),
) => {
  const publicKey = ethers.concat(
    [
      secp256r1.getPublicKey(privateKey, false).slice(0x01, 0x21),
      secp256r1.getPublicKey(privateKey, false).slice(0x21, 0x41),
    ].map(ethers.hexlify),
  );
  const { r, s, recovery } = ensureLowerOrderS(secp256r1.sign(messageHash.replace(/0x/, ''), privateKey));
  const signature = ethers.concat([r, s].map(v => ethers.toBeHex(v, 0x20)));
  return { privateKey, publicKey, signature, recovery, messageHash };
};

async function fixture() {
  const mock = await ethers.deployContract('$TRC7913P256Verifier');
  const verifyMagic = mock.interface.getFunction('verify').selector;
  return { mock, verifyMagic };
}

describe('TRC7913P256Verifier', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
    Object.assign(this, prepareSignature());
  });

  it('accepts a canonical 0x40-byte (r || s) signature', async function () {
    expect(await this.mock.verify(this.publicKey, this.messageHash, this.signature)).to.equal(this.verifyMagic);
  });

  // Regression test: the verifier previously required exactly 0x40 bytes and rejected a 0x41-byte signature
  // carrying a trailing recovery byte, even though OZ ERC-7913 and the port's own SignerP256 accept it (only
  // the first 0x40 bytes are read). See contracts/utils/cryptography/verifiers/TRC7913P256Verifier.sol.
  it('accepts a 0x41-byte signature carrying a trailing recovery byte', async function () {
    const signature65 = ethers.concat([this.signature, ethers.toBeHex(this.recovery, 1)]);
    expect(await this.mock.verify(this.publicKey, this.messageHash, signature65)).to.equal(this.verifyMagic);
  });

  it('rejects a signature shorter than 0x40 bytes', async function () {
    const short = ethers.dataSlice(this.signature, 0, 0x3f);
    expect(await this.mock.verify(this.publicKey, this.messageHash, short)).to.equal('0xffffffff');
  });

  it('rejects a signature that does not match the key and hash', async function () {
    const otherHash = ethers.hexlify(ethers.randomBytes(0x20));
    expect(await this.mock.verify(this.publicKey, otherHash, this.signature)).to.equal('0xffffffff');
  });

  it('rejects a key that is not 0x40 bytes', async function () {
    const shortKey = ethers.dataSlice(this.publicKey, 0, 0x3f);
    expect(await this.mock.verify(shortKey, this.messageHash, this.signature)).to.equal('0xffffffff');
  });
});
