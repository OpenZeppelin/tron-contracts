const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

async function fixture() {
  const [deployer, other] = await ethers.getSigners();

  const factory = await ethers.deployContract('$Create3');

  // Bytecode for deploying a contract that includes a constructor (a vesting wallet, 3 constructor args).
  const constructorByteCode = await ethers
    .getContractFactory('VestingWallet')
    .then(f => ethers.concat([f.bytecode, f.interface.encodeDeploy([other.address, 0n, 0n])]));

  return { deployer, other, factory, constructorByteCode };
}

describe('Create3', function () {
  const saltHex = ethers.id('salt message');

  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  // NOTE: Upstream's address-prediction and successful-deploy assertions are intentionally omitted here.
  // `Create3` does not produce reproducible addresses on the TVM: the intermediate proxy deploys the final
  // contract with an opcode-level `CREATE`, whose TVM address derives from the transaction hash, not
  // `(sender, nonce)` (see the IMPORTANT note in `Create3.sol` and TIP-26), so `computeAddress` and the address
  // returned by `deploy` do not match the actual deployment. Only the VM-agnostic failure paths are asserted.
  describe('deploy — failure paths (VM-agnostic)', function () {
    it('reverts when the salt was already used', async function () {
      await expect(this.factory.$deploy(0n, saltHex, this.constructorByteCode)).to.emit(this.factory, 'return$deploy');
      await expect(this.factory.$deploy(0n, saltHex, this.constructorByteCode)).to.be.revertedWithCustomError(
        this.factory,
        'FailedDeployment',
      );
    });

    it('reverts when the bytecode is empty', async function () {
      await expect(this.factory.$deploy(0n, saltHex, '0x')).to.be.revertedWithCustomError(
        this.factory,
        'Create3EmptyBytecode',
      );
    });

    it('reverts when the factory balance is below the value', async function () {
      await expect(this.factory.$deploy(1n, saltHex, this.constructorByteCode)).to.be.revertedWithCustomError(
        this.factory,
        'InsufficientBalance',
      );
    });
  });
});
