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

  // A recipient embedded in a crosschain message payload must be exactly 20 bytes. `bytes20` silently reshapes
  // anything else into a different address — dropping the tail of a longer value, right-padding a shorter one with
  // zeros — so the length is checked rather than the cast trusted. Both directions are covered here.
  describe('rejects a non-20-byte recipient in the payload', function () {
    const amount = 100n;

    beforeEach(function () {
      // Deliver through the registered gateway + counterpart so authorization passes and _processMessage runs.
      this.deliver = recipient =>
        this.bridgeA
          .connect(this.gatewayAsEOA)
          .receiveMessage(
            ethers.ZeroHash,
            this.chain.toErc7930(this.bridgeB),
            ethers.AbiCoder.defaultAbiCoder().encode(
              ['bytes', 'bytes', 'uint256'],
              [this.chain.toErc7930(this.accounts[0]), recipient, amount],
            ),
          );
    });

    it('reverts on a 21-byte recipient, which `bytes20` would truncate', async function () {
      // The 21-byte 0x41-prefixed form TronWeb and the node APIs surface for an account.
      const recipient = ethers.concat(['0x41', this.accounts[1].address]);
      await expect(this.deliver(recipient))
        .to.be.revertedWithCustomError(this.bridgeA, 'BridgeInvalidRecipient')
        .withArgs(recipient);
    });

    it('reverts on a 19-byte recipient, which `bytes20` would zero-pad', async function () {
      const recipient = ethers.dataSlice(this.accounts[1].address, 0, 19);
      await expect(this.deliver(recipient))
        .to.be.revertedWithCustomError(this.bridgeA, 'BridgeInvalidRecipient')
        .withArgs(recipient);
    });
  });

  // Regression test for the audit finding: BridgeTRC20._onReceive previously used SafeTRC20.safeTransfer, which
  // reverts for TRON USDT (whose `transfer` returns `false` on a successful transfer). Because locking
  // (_onSend -> safeTransferFrom) keeps working for USDT, that asymmetry let deposits through while permanently
  // trapping every withdrawal in the bridge. _onReceive now uses safeTransferChecked (balance-delta verification).
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
