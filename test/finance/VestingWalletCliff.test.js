const { ethers } = require('hardhat');
const { expect } = require('chai');

const { min } = require('../helpers/math');
const time = require('../helpers/time');

const { envSetup, shouldBehaveLikeVesting } = require('./VestingWallet.behavior');

// See test/finance/VestingWallet.test.js for the rationale —
// TRE's `tre_revert` does not roll back the chain clock, so the
// fixture's `start = block.timestamp + 1h` goes stale across
// snapshot restores. Re-run the fixture each call and refund
// signers between cases.
const { refundSigners } = require('@openzeppelin/hardhat-tron/signers');
const hre = require('hardhat');
const loadFixture = async fn => {
  await refundSigners(hre);
  return fn();
};

async function fixture() {
  // `parseEther('100')` = 1e20 sun would exceed Long.MAX_VALUE under
  // the bridge's 1-wei == 1-sun pass-through. Vesting math is
  // amount-relative, so 1 ETH-equivalent preserves every assertion.
  const amount = ethers.parseEther('1');
  const duration = time.duration.years(4);
  const start = (await time.clock.timestamp()) + time.duration.hours(1);
  const cliffDuration = time.duration.years(1);
  const cliff = start + cliffDuration;

  const [sender, beneficiary] = await ethers.getSigners();
  const mock = await ethers.deployContract('$VestingWalletCliff', [beneficiary, start, duration, cliffDuration]);

  const token = await ethers.deployContract('$TRC20', ['Name', 'Symbol']);
  await token.$_mint(mock, amount);
  await sender.sendTransaction({ to: mock, value: amount, data: '0x' });

  const env = await envSetup(mock, beneficiary, token);

  const schedule = Array.from({ length: 64 }, (_, i) => (BigInt(i) * duration) / 60n + start);
  const vestingFn = timestamp => min(amount, timestamp < cliff ? 0n : (amount * (timestamp - start)) / duration);

  return { mock, duration, start, beneficiary, cliff, schedule, vestingFn, env };
}

describe('VestingWalletCliff', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  it('rejects a larger cliff than vesting duration', async function () {
    await expect(
      ethers.deployContract('$VestingWalletCliff', [this.beneficiary, this.start, this.duration, this.duration + 1n]),
    )
      .revertedWithCustomError(this.mock, 'InvalidCliffDuration')
      .withArgs(this.duration + 1n, this.duration);
  });

  it('check vesting contract', async function () {
    expect(await this.mock.owner()).to.equal(this.beneficiary);
    expect(await this.mock.start()).to.equal(this.start);
    expect(await this.mock.duration()).to.equal(this.duration);
    expect(await this.mock.end()).to.equal(this.start + this.duration);
    expect(await this.mock.cliff()).to.equal(this.cliff);
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
});
