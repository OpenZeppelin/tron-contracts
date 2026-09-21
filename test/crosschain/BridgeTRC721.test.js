const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { impersonate } = require('../helpers/account');
const { getLocalChain } = require('../helpers/chains');

const { shouldBehaveLikeBridgeTRC721 } = require('./BridgeTRC721.behavior');

async function fixture() {
  const chain = await getLocalChain();
  const accounts = await ethers.getSigners();

  // Mock gateway
  const gateway = await ethers.deployContract('$TRC7786GatewayMock');
  const gatewayAsEOA = await impersonate(gateway);

  // Chain A: legacy TRC721 with bridge
  const tokenA = await ethers.deployContract('$TRC721', ['Token1', 'T1']);
  const bridgeA = await ethers.deployContract('$BridgeTRC721', [[], tokenA]);

  // Chain B: TRC721 with native bridge integration
  const tokenB = await ethers.deployContract('$TRC721Crosschain', [
    [[gateway, chain.toErc7930(bridgeA)]],
    'Token2',
    'T2',
  ]);
  const bridgeB = tokenB; // self bridge

  // deployment check + counterpart setup
  await expect(bridgeA.$_setLink(gateway, chain.toErc7930(bridgeB), false))
    .to.emit(bridgeA, 'LinkRegistered')
    .withArgs(gateway, chain.toErc7930(bridgeB));

  return { chain, accounts, gateway, gatewayAsEOA, tokenA, tokenB, bridgeA, bridgeB };
}

describe('CrosschainBridgeTRC721', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  it('token getters', async function () {
    await expect(this.bridgeA.token()).to.eventually.equal(this.tokenA);
  });

  shouldBehaveLikeBridgeTRC721({ chainAIsCustodial: true });
});
