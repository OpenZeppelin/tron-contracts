const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { getLocalChain } = require('../helpers/chains');

async function fixture() {
  const chain = await getLocalChain();
  const [counterpart, other] = await ethers.getSigners();

  const gateway = await ethers.deployContract('$TRC7786GatewayMock');
  const token = await ethers.deployContract('$TRC20', ['Token', 'T']);
  // `$BridgeTRC20` is a concrete `CrosschainLinked`. Register a link to `counterpart` on the local chain.
  const linked = await ethers.deployContract('$BridgeTRC20', [[], token]);
  await linked.$_setLink(gateway, chain.toErc7930(counterpart), false);

  return { chain, gateway, counterpart, other, linked };
}

describe('CrosschainLinked', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  describe('_isAuthorizedGateway', function () {
    it('authorizes the registered gateway and counterpart', async function () {
      const sender = this.chain.toErc7930(this.counterpart);
      await expect(this.linked.$_isAuthorizedGateway(this.gateway, sender)).to.eventually.be.true;
    });

    it('rejects an instance that is not the registered gateway', async function () {
      const sender = this.chain.toErc7930(this.counterpart);
      await expect(this.linked.$_isAuthorizedGateway(this.other, sender)).to.eventually.be.false;
    });

    it('rejects a sender that is not the registered counterpart', async function () {
      const sender = this.chain.toErc7930(this.other);
      await expect(this.linked.$_isAuthorizedGateway(this.gateway, sender)).to.eventually.be.false;
    });

    it('reverts on a malformed sender', async function () {
      await expect(this.linked.$_isAuthorizedGateway(this.gateway, '0x00010042')).to.be.revertedWithCustomError(
        this.linked,
        'InteroperableAddressParsingError',
      );
    });
  });
});
