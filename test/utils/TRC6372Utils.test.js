const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const time = require('../helpers/time');

const CLOCK_MODE = {
  timestamp: 'mode=timestamp',
  blockNumber: 'mode=blocknumber&from=default',
};

async function fixture() {
  const mock = await ethers.deployContract('$TRC6372Utils');
  const instances = {
    blockNumber: await ethers.deployContract('$TRC20Votes', ['My Token', 'MTKN', 'My Token', '1']),
    timestamp: await ethers.deployContract('$TRC20VotesTimestampMock', ['My Token', 'MTKN', 'My Token', '1']),
  };

  return { mock, instances };
}

describe('TRC6372Utils', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  for (const mode of ['timestamp', 'blockNumber']) {
    describe(mode, function () {
      it('clock mode from matching instance: success', async function () {
        await expect(this.mock[`$${mode}ClockMode(address)`](this.instances[mode])).to.eventually.equal(
          CLOCK_MODE[mode],
        );
      });

      it('clock mode from mismatching instance: revert', async function () {
        for (const [key, instance] of Object.entries(this.instances)) {
          if (key == mode) continue;
          await expect(this.mock[`$${mode}ClockMode(address)`](instance)).to.be.revertedWithCustomError(
            this.mock,
            'TRC6372InconsistentClock',
          );
        }
      });

      it('clock mode from uint48', async function () {
        const clock = await time.clock[mode]();
        await expect(this.mock[`$${mode}ClockMode(uint48)`](clock)).to.eventually.equal(CLOCK_MODE[mode]);
        await expect(this.mock[`$${mode}ClockMode(uint48)`](clock - 1n)).to.be.revertedWithCustomError(
          this.mock,
          'TRC6372InconsistentClock',
        );
        await expect(this.mock[`$${mode}ClockMode(uint48)`](clock + 1n)).to.be.revertedWithCustomError(
          this.mock,
          'TRC6372InconsistentClock',
        );
      });
    });
  }
});
