const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { impersonate } = require('../helpers/account');
const { getLocalChain } = require('../helpers/chains');

const { shouldBehaveLikeBridgeTRC20 } = require('./BridgeTRC20.behavior');

async function fixture() {
  const chain = await getLocalChain();
  const accounts = await ethers.getSigners();

  // Mock gateway
  const gateway = await ethers.deployContract('$TRC7786GatewayMock');
  const gatewayAsEOA = await impersonate(gateway);

  // Chain A: legacy TRC20 with bridge
  const tokenA = await ethers.deployContract('$TRC20', ['Token1', 'T1']);
  const bridgeA = await ethers.deployContract('$BridgeTRC20', [[], tokenA]);

  // Chain B: TRC7802 with bridge (preconfigured link to bridgeA)
  const tokenB = await ethers.deployContract('$TRC20BridgeableMock', ['Token2', 'T2', ethers.ZeroAddress]);
  const bridgeB = await ethers.deployContract('$BridgeTRC7802', [[[gateway, chain.toErc7930(bridgeA)]], tokenB]);

  // deployment check + counterpart setup
  await expect(bridgeA.$_setLink(gateway, chain.toErc7930(bridgeB), false))
    .to.emit(bridgeA, 'LinkRegistered')
    .withArgs(gateway, chain.toErc7930(bridgeB));
  await tokenB.$_setBridge(bridgeB);

  return { chain, accounts, gateway, gatewayAsEOA, tokenA, tokenB, bridgeA, bridgeB };
}

describe('CrosschainBridgeTRC20', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  it('token getters', async function () {
    await expect(this.bridgeA.token()).to.eventually.equal(this.tokenA);
    await expect(this.bridgeB.token()).to.eventually.equal(this.tokenB);
  });

  shouldBehaveLikeBridgeTRC20({ chainAIsCustodial: true });

  // A recipient embedded in a crosschain message payload must be the 20-byte EVM address. TronWeb conventions
  // surface addresses as the 21-byte 0x41-prefixed form; without a length check `bytes20(toBinary)` would silently
  // truncate that to a different recipient and release custody to the wrong address. BridgeFungible rejects it.
  describe('rejects a non-20-byte (21-byte 0x41-prefixed TRON) recipient in the payload', function () {
    const amount = 100n;

    it('reverts BridgeInvalidRecipient instead of releasing custody to a truncated address', async function () {
      const [alice, bruce] = this.accounts;
      const tron21 = ethers.concat(['0x41', bruce.address]); // 21-byte 0x41-prefixed form of bruce
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes', 'bytes', 'uint256'],
        [this.chain.toErc7930(alice), tron21, amount],
      );
      // Deliver through the registered gateway + counterpart so authorization passes and _processMessage runs.
      await expect(
        this.bridgeA
          .connect(this.gatewayAsEOA)
          .receiveMessage(ethers.ZeroHash, this.chain.toErc7930(this.bridgeB), payload),
      )
        .to.be.revertedWithCustomError(this.bridgeA, 'BridgeInvalidRecipient')
        .withArgs(tron21);
    });
  });

  // Regression test for the audit finding: BridgeTRC20._onReceive previously used SafeTRC20.safeTransfer, which
  // reverts for TRON USDT (whose `transfer` returns `false` on a successful transfer). Because locking
  // (_onSend -> safeTransferFrom) keeps working for USDT, that asymmetry let deposits through while permanently
  // trapping every withdrawal in the bridge. _onReceive now uses safeTransferUSDT (balance-delta verification).
  describe('releases custody of USDT-like tokens (transfer returns false on success)', function () {
    const amount = 100n;

    beforeEach(async function () {
      this.usdt = await ethers.deployContract('$TRC20USDTMock', ['Tether USD', 'USDT']);
      this.usdtBridge = await ethers.deployContract('$BridgeTRC20', [[], this.usdt]);
      // The bridge holds custody of the funds to be released on receive.
      await this.usdt.$_mint(this.usdtBridge, amount);
    });

    it('does not revert and delivers the tokens to the receiver', async function () {
      const [, receiver] = this.accounts;

      await expect(this.usdtBridge.$_onReceive(receiver, amount)).to.changeTokenBalances(
        this.usdt,
        [this.usdtBridge, receiver],
        [-amount, amount],
      );
    });
  });
});
