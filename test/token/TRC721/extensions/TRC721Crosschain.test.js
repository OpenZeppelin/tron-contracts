const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { impersonate } = require('../../../helpers/account');
const { getLocalChain } = require('../../../helpers/chains');

const { shouldBehaveLikeBridgeTRC721 } = require('../../../crosschain/BridgeTRC721.behavior');

async function fixture() {
  const chain = await getLocalChain();
  const accounts = await ethers.getSigners();

  // Mock gateway
  const gateway = await ethers.deployContract('$TRC7786GatewayMock');
  const gatewayAsEOA = await impersonate(gateway);

  // Chain A: TRC721 with native bridge integration
  const tokenA = await ethers.deployContract('$TRC721Crosschain', [[], 'Token1', 'T1']);
  const bridgeA = tokenA; // self bridge

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

describe('TRC721Crosschain', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  shouldBehaveLikeBridgeTRC721();
});
