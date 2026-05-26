const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const name = 'My Token';
const symbol = 'MTKN';
const cap = 1000n;

async function fixture() {
  const [user] = await ethers.getSigners();

  const token = await ethers.deployContract('$TRC20Capped', [name, symbol, cap]);

  return { user, token, cap };
}

describe('TRC20Capped', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  it('requires a non-zero cap', async function () {
    const TRC20Capped = await ethers.getContractFactory('$TRC20Capped');

    await expect(TRC20Capped.deploy(name, symbol, 0))
      .to.be.revertedWithCustomError(TRC20Capped, 'TRC20InvalidCap')
      .withArgs(0);
  });

  describe('capped token', function () {
    it('starts with the correct cap', async function () {
      expect(await this.token.cap()).to.equal(this.cap);
    });

    it('mints when value is less than cap', async function () {
      const value = this.cap - 1n;
      await this.token.$_mint(this.user, value);
      expect(await this.token.totalSupply()).to.equal(value);
    });

    it('fails to mint if the value exceeds the cap', async function () {
      await this.token.$_mint(this.user, this.cap - 1n);
      await expect(this.token.$_mint(this.user, 2))
        .to.be.revertedWithCustomError(this.token, 'TRC20ExceededCap')
        .withArgs(this.cap + 1n, this.cap);
    });

    it('fails to mint after cap is reached', async function () {
      await this.token.$_mint(this.user, this.cap);
      await expect(this.token.$_mint(this.user, 1))
        .to.be.revertedWithCustomError(this.token, 'TRC20ExceededCap')
        .withArgs(this.cap + 1n, this.cap);
    });
  });
});
