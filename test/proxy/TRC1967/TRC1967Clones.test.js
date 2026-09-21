const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { generators } = require('../../helpers/random');

// TVM `create` derives the deployed address from the transaction id (not `(sender, nonce)`), so a
// plain-`clone` address cannot be predicted off-chain: read it from the deploy receipt's
// internal-transaction trace (`transferTo_address` is TVM hex `41` + 20-byte body → re-prefix `0x`).
// On the in-process EVM (e.g. under coverage) there is no such trace, so fall back to the staticCall
// prediction, which is exact there. `cloneDeterministic` (`create2`) is unaffected — its address is
// `sha3(0x41, deployer, salt, codeHash)`, reproducible via `predictDeterministicAddress`.
async function createdAddress(predicted, tx) {
  const receipt = await tx.wait();
  const internalTx = receipt.internalTransactions && receipt.internalTransactions[0];
  return internalTx && internalTx.transferTo_address ? '0x' + internalTx.transferTo_address.slice(2) : predicted;
}

async function fixture() {
  const [admin] = await ethers.getSigners();
  const factory = await ethers.deployContract('$TRC1967Clones');
  const implementation = await ethers.deployContract('DummyImplementation');
  return { admin, factory, implementation };
}

describe('TRC1967Clones', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  // A minimal proxy delegates to its implementation: `DummyImplementation.get()` returns true through it.
  async function expectDelegates(address) {
    await expect(ethers.getContractAt('DummyImplementation', address).then(proxy => proxy.get())).to.eventually.be.true;
  }

  describe('clone (create)', function () {
    it('deploys a working proxy that emits Upgraded and delegates', async function () {
      const predicted = await this.factory.$clone.staticCall(this.implementation);
      const tx = await this.factory.$clone(this.implementation);
      const address = await createdAddress(predicted, tx);

      await expect(tx)
        .to.emit(await ethers.getContractAt('ITRC1967', address), 'Upgraded')
        .withArgs(this.implementation);
      await expectDelegates(address);
    });

    it('forwards value to the new clone', async function () {
      const value = 1_000_000n;
      await this.admin.sendTransaction({ to: this.factory, value, data: '0x' });

      const predicted = await this.factory.$clone.staticCall(this.implementation, ethers.Typed.uint256(value));
      const tx = await this.factory.$clone(this.implementation, ethers.Typed.uint256(value));
      const address = await createdAddress(predicted, tx);

      await expect(ethers.provider.getBalance(address)).to.eventually.equal(value);
      await expect(ethers.provider.getBalance(this.factory)).to.eventually.equal(0n);
    });

    it('reverts when the factory balance is below value', async function () {
      const value = 1_000_000n;
      await expect(this.factory.$clone(this.implementation, ethers.Typed.uint256(value)))
        .to.be.revertedWithCustomError(this.factory, 'InsufficientBalance')
        .withArgs(0n, value);
    });
  });

  describe('cloneDeterministic (create2)', function () {
    it('deploys a working proxy that emits Upgraded and delegates', async function () {
      const salt = generators.bytes32();
      // The staticCall returns wherever the CREATE2 opcode actually lands on the active VM;
      // predictDeterministicAddress (TVM 0x41) is checked against it separately below.
      const address = await this.factory.$cloneDeterministic.staticCall(
        this.implementation,
        ethers.Typed.bytes32(salt),
      );

      await expect(this.factory.$cloneDeterministic(this.implementation, ethers.Typed.bytes32(salt)))
        .to.emit(await ethers.getContractAt('ITRC1967', address), 'Upgraded')
        .withArgs(this.implementation);
      await expectDelegates(address);
    });

    it('predictDeterministicAddress matches the deployment [skip-on-coverage]', async function () {
      // predictDeterministicAddress derives the address with the TVM/TIP-26 0x41 CREATE2 prefix, so it only
      // equals the real deployment on the TVM (the in-process EVM opcode uses 0xff). Skipped under coverage.
      const salt = generators.bytes32();
      const predicted = await this.factory.$predictDeterministicAddress(
        this.implementation,
        ethers.Typed.bytes32(salt),
      );
      const actual = await this.factory.$cloneDeterministic.staticCall(this.implementation, ethers.Typed.bytes32(salt));
      expect(predicted).to.equal(actual);
    });

    it('reverts when the same implementation and salt are reused', async function () {
      const salt = generators.bytes32();
      await this.factory.$cloneDeterministic(this.implementation, ethers.Typed.bytes32(salt));
      await expect(
        this.factory.$cloneDeterministic(this.implementation, ethers.Typed.bytes32(salt)),
      ).to.be.revertedWithCustomError(this.factory, 'FailedDeployment');
    });

    it('predicts addresses for an arbitrary deployer', async function () {
      const salt = generators.bytes32();
      const deployer = generators.address();

      const predicted = await this.factory.$predictDeterministicAddress(
        this.implementation,
        ethers.Typed.bytes32(salt),
        ethers.Typed.address(deployer),
      );

      // the prediction for an arbitrary deployer differs from the one for the factory
      await expect(
        this.factory.$predictDeterministicAddress(this.implementation, ethers.Typed.bytes32(salt)),
      ).to.eventually.not.equal(predicted);
      // and can be reproduced on-chain by passing that deployer explicitly
      await expect(
        this.factory.$predictDeterministicAddress(
          this.implementation,
          ethers.Typed.bytes32(salt),
          ethers.Typed.address(deployer),
        ),
      ).to.eventually.equal(predicted);
    });

    it('forwards value to the new clone', async function () {
      const value = 1_000_000n;
      await this.admin.sendTransaction({ to: this.factory, value, data: '0x' });

      const salt = generators.bytes32();
      const address = await this.factory.$cloneDeterministic.staticCall(
        this.implementation,
        ethers.Typed.bytes32(salt),
        ethers.Typed.uint256(value),
      );

      await this.factory.$cloneDeterministic(
        this.implementation,
        ethers.Typed.bytes32(salt),
        ethers.Typed.uint256(value),
      );

      await expect(ethers.provider.getBalance(address)).to.eventually.equal(value);
      await expect(ethers.provider.getBalance(this.factory)).to.eventually.equal(0n);
    });

    it('reverts when the factory balance is below value', async function () {
      const value = 1_000_000n;
      const salt = generators.bytes32();
      await expect(
        this.factory.$cloneDeterministic(this.implementation, ethers.Typed.bytes32(salt), ethers.Typed.uint256(value)),
      )
        .to.be.revertedWithCustomError(this.factory, 'InsufficientBalance')
        .withArgs(0n, value);
    });
  });
});
