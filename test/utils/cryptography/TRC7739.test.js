const { ethers } = require('hardhat');
const { shouldBehaveLikeTRC1271 } = require('./TRC1271.behavior');
const { NonNativeSigner, P256SigningKey, RSASHA256SigningKey } = require('../../helpers/signers');

describe('TRC7739 [skip-on-coverage]', function () {
  describe('for an ECDSA signer', function () {
    before(async function () {
      this.signer = ethers.Wallet.createRandom();
      this.mock = await ethers.deployContract('$TRC7739ECDSAMock', ['TRC7739ECDSA', '1', this.signer.address]);
    });

    shouldBehaveLikeTRC1271({ erc7739: true });
  });

  describe('for a P256 signer', function () {
    before(async function () {
      this.signer = new NonNativeSigner(P256SigningKey.random());
      this.mock = await ethers.deployContract('$TRC7739P256Mock', [
        'TRC7739P256',
        '1',
        this.signer.signingKey.publicKey.qx,
        this.signer.signingKey.publicKey.qy,
      ]);
    });

    shouldBehaveLikeTRC1271({ erc7739: true });
  });

  describe('for an RSA signer', function () {
    before(async function () {
      this.signer = new NonNativeSigner(RSASHA256SigningKey.random());
      this.mock = await ethers.deployContract('$TRC7739RSAMock', [
        'TRC7739RSA',
        '1',
        this.signer.signingKey.publicKey.e,
        this.signer.signingKey.publicKey.n,
      ]);
    });

    shouldBehaveLikeTRC1271({ erc7739: true });
  });
});
