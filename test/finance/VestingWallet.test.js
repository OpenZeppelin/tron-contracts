const { ethers } = require('hardhat');
const { expect } = require('chai');

const { min } = require('../helpers/math');
const time = require('../helpers/time');

const { envSetup, shouldBehaveLikeVesting } = require('./VestingWallet.behavior');

// TRE's `tre_revert` intentionally does not roll back the chain clock
// (block history / LBHT are skipped — see TreJsonRpcImpl.java's
// snapshot/revert section). hardhat-network-helpers' `loadFixture`
// caches the fixture result after the first call and replays it from
// a snapshot on subsequent ones, but here the fixture computes
// `start = block.timestamp + 1h` and a schedule keyed off that
// timestamp. On the second call the cached `start` is already in the
// past, and `time.increaseTo(schedule[0])` throws
// "target X must be > current Y". Re-run the fixture each time so
// `start` is recomputed against the live chain clock, and refund
// signers via `tre_setAccountBalance` so `sender.sendTransaction({to,
// value})` does not run dry after the first handful of cases.
const { refundSigners } = require('@openzeppelin/hardhat-tron/signers');
const hre = require('hardhat');
const loadFixture = async fn => {
  await refundSigners(hre);
  return fn();
};

async function fixture() {
  // `parseEther('100')` would be 1e20 sun under the bridge's 1-wei
  // == 1-sun pass-through, which exceeds TVM's account-balance
  // Long.MAX_VALUE (~9.22e18 sun). VestingWallet's schedule/release
  // assertions are amount-relative, so 1 ETH-equivalent preserves
  // every semantic check (linear vesting, release at start /
  // mid-stream / end, TRC20 token vesting).
  const amount = ethers.parseEther('1');
  const duration = time.duration.years(4);
  const start = (await time.clock.timestamp()) + time.duration.hours(1);

  const [sender, beneficiary] = await ethers.getSigners();
  const mock = await ethers.deployContract('VestingWallet', [beneficiary, start, duration]);

  const token = await ethers.deployContract('$TRC20', ['Name', 'Symbol']);
  await token.$_mint(mock, amount);
  await sender.sendTransaction({ to: mock, value: amount, data: '0x' });

  const env = await envSetup(mock, beneficiary, token);

  const schedule = Array.from({ length: 64 }, (_, i) => (BigInt(i) * duration) / 60n + start);
  const vestingFn = timestamp => min(amount, (amount * (timestamp - start)) / duration);

  return { mock, duration, start, beneficiary, schedule, vestingFn, env };
}

describe('VestingWallet', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  it('rejects zero address for beneficiary', async function () {
    await expect(ethers.deployContract('VestingWallet', [ethers.ZeroAddress, this.start, this.duration]))
      .revertedWithCustomError(this.mock, 'OwnableInvalidOwner')
      .withArgs(ethers.ZeroAddress);
  });

  it('check vesting contract', async function () {
    expect(await this.mock.owner()).to.equal(this.beneficiary);
    expect(await this.mock.start()).to.equal(this.start);
    expect(await this.mock.duration()).to.equal(this.duration);
    expect(await this.mock.end()).to.equal(this.start + this.duration);
  });

  describe('vesting schedule', function () {
    describe('Eth vesting', function () {
      beforeEach(async function () {
        Object.assign(this, this.env.eth);
      });

      shouldBehaveLikeVesting();
    });

    describe('TRC20 vesting', function () {
      beforeEach(async function () {
        Object.assign(this, this.env.token);
      });

      shouldBehaveLikeVesting();
    });
  });

  // release(token) pays out with safeTransferChecked (balance-delta verified), not safeTransfer. A token that
  // returns `false` from a *successful* transfer — TRON USDT — is read as a failure by safeTransfer, which would
  // revert every release. VestingWallet has no rescue path and is not upgradeable, so the funds would be lost.
  describe('releases a USDT-like token (transfer returns false on success)', function () {
    const amount = 1000n;

    beforeEach(async function () {
      // Start the schedule in the past so the whole balance is vested and releasable immediately.
      const start = (await time.clock.timestamp()) - this.duration;
      this.usdtWallet = await ethers.deployContract('VestingWallet', [this.beneficiary, start, this.duration]);
      this.usdt = await ethers.deployContract('$TRC20USDTMock', ['Tether USD', 'USDT']);
      await this.usdt.$_mint(this.usdtWallet, amount);
    });

    it('delivers the vested tokens to the beneficiary instead of reverting', async function () {
      expect(await this.usdtWallet.releasable(ethers.Typed.address(this.usdt))).to.equal(amount);

      await expect(this.usdtWallet.release(ethers.Typed.address(this.usdt))).to.changeTokenBalances(
        this.usdt,
        [this.usdtWallet, this.beneficiary],
        [-amount, amount],
      );
    });
  });
});
