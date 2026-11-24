const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { impersonate } = require('../../../helpers/account');
const { getLocalChain } = require('../../../helpers/chains');

const { shouldBehaveLikeBridgeTRC1155 } = require('../../../crosschain/BridgeTRC1155.behavior');

async function fixture() {
  const chain = await getLocalChain();
  const accounts = await ethers.getSigners();

  // Mock gateway
  const gateway = await ethers.deployContract('$TRC7786GatewayMock');
  const gatewayAsEOA = await impersonate(gateway);

  // Chain A: TRC1155 with native bridge integration
  const tokenA = await ethers.deployContract('$TRC1155Crosschain', [[], 'https://token-cdn-domain/{id}.json']);
  const bridgeA = tokenA; // self bridge

  // Chain B: TRC1155 with native bridge integration
  const tokenB = await ethers.deployContract('$TRC1155Crosschain', [
    [[gateway, chain.toErc7930(bridgeA)]],
    'https://token-cdn-domain/{id}.json',
  ]);
  const bridgeB = tokenB; // self bridge

  // deployment check + counterpart setup
  await expect(bridgeA.$_setLink(gateway, chain.toErc7930(bridgeB), false))
    .to.emit(bridgeA, 'LinkRegistered')
    .withArgs(gateway, chain.toErc7930(bridgeB));

  return { chain, accounts, gateway, gatewayAsEOA, tokenA, tokenB, bridgeA, bridgeB };
}

describe('TRC1155Crosschain', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  shouldBehaveLikeBridgeTRC1155();
});
