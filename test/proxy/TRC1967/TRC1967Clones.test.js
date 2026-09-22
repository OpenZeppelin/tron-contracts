const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { generators } = require('../../helpers/random');
const shouldBehaveLikeProxy = require('../Proxy.behaviour');

// 1 wei == 1 sun on the TVM, so parseEther-scale values overflow int64; keep the forwarded value small.
const VALUE = 1_000_000n;

// TVM `create` derives the deployed address from the transaction id (not `(sender, nonce)`), so a
// plain-`clone` address cannot be predicted off-chain: read it from the deploy receipt's
// internal-transaction trace (`transferTo_address` is TVM hex `41` + 20-byte body → re-prefix `0x`), falling
// back to the staticCall on the in-process EVM (exact there). `cloneDeterministic` (`create2`) staticCall
// returns wherever the opcode actually lands on the active VM, so it needs no such handling.
async function createdAddress(predicted, tx) {
  const receipt = await tx.wait();
  const internalTx = receipt.internalTransactions && receipt.internalTransactions[0];
  return internalTx && internalTx.transferTo_address
    ? ethers.getAddress('0x' + internalTx.transferTo_address.slice(2))
    : predicted;
}

const fixture = async () => {
  const [admin, nonContractAddress] = await ethers.getSigners();

  const factory = await ethers.deployContract('$TRC1967Clones');
  const implementation = await ethers.deployContract('DummyImplementation');
  const trc1967 = await ethers.getContractFactory('$TRC1967Utils');

  return { admin, nonContractAddress, factory, trc1967, implementation };
};

describe('TRC1967Clones', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  describe('non-deterministic deployment (create)', function () {
    before(function () {
      this.createProxy = async (implementation, initData, opts = {}) => {
        const predicted = await this.factory.$clone.staticCall(implementation);
        const deploymentTx = await this.factory.$clone(implementation);
        const address = await createdAddress(predicted, deploymentTx);

        await expect(deploymentTx)
          .to.emit(this.factory, 'return$clone_address')
          .withArgs(address)
          .to.emit(this.trc1967.attach(address), 'Upgraded')
          .withArgs(implementation);

        if (initData !== '0x' || opts.value > 0n) {
          await this.admin.sendTransaction({ to: address, data: initData, ...opts });
        }

        return new ethers.Contract(address, [], this.admin, deploymentTx);
      };
    });

    shouldBehaveLikeProxy({ allowUninitialized: true, allowNonContractAddress: true });

    it('forwards value to the new clone', async function () {
      await this.admin.sendTransaction({ to: this.factory, value: VALUE, data: '0x' });

      const predicted = await this.factory.$clone.staticCall(this.implementation, ethers.Typed.uint256(VALUE));
      const tx = await this.factory.$clone(this.implementation, ethers.Typed.uint256(VALUE));
      const address = await createdAddress(predicted, tx);

      await expect(ethers.provider.getBalance(address)).to.eventually.equal(VALUE);
      await expect(ethers.provider.getBalance(this.factory)).to.eventually.equal(0n);
    });

    it('reverts when factory balance is below value', async function () {
      await expect(this.factory.$clone(this.implementation, ethers.Typed.uint256(VALUE)))
        .to.be.revertedWithCustomError(this.factory, 'InsufficientBalance')
        .withArgs(0n, VALUE);
    });
  });

  describe('deterministic deployment (create2)', function () {
    before(function () {
      this.createProxy = async (implementation, initData, opts = {}) => {
        const salt = ethers.Typed.bytes32(opts.salt ?? generators.bytes32());
        // Use the CREATE2 staticCall address (matches the opcode on any VM); predictDeterministicAddress
        // (TVM 0x41) is checked against it separately below.
        const address = await this.factory.$cloneDeterministic.staticCall(implementation, salt);
        const deploymentTx = await this.factory.$cloneDeterministic(implementation, salt);

        await expect(deploymentTx)
          .to.emit(this.factory, 'return$cloneDeterministic_address_bytes32')
          .withArgs(address)
          .to.emit(this.trc1967.attach(address), 'Upgraded')
          .withArgs(implementation);

        if (initData !== '0x' || opts.value > 0n) {
          await this.admin.sendTransaction({ to: address, data: initData, ...opts });
        }

        return new ethers.Contract(address, [], this.admin, deploymentTx);
      };
    });

    shouldBehaveLikeProxy({ allowUninitialized: true, allowNonContractAddress: true });

    it('reverts when the same implementation and salt are reused', async function () {
      const salt = generators.bytes32();
      await expect(this.factory.$cloneDeterministic(this.implementation, salt)).to.not.be.reverted;
      await expect(this.factory.$cloneDeterministic(this.implementation, salt)).to.be.revertedWithCustomError(
        this.factory,
        'FailedDeployment',
      );
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

    it('predicts addresses for an arbitrary deployer', async function () {
      const salt = generators.bytes32();
      const deployer = generators.address();

      const predicted = await this.factory.$predictDeterministicAddress(
        this.implementation,
        ethers.Typed.bytes32(salt),
        ethers.Typed.address(deployer),
      );

      // address predicted for a deployer that is not the factory doesn't match the one predicted for the factory
      await expect(
        this.factory.$predictDeterministicAddress(this.implementation, ethers.Typed.bytes32(salt)),
      ).to.eventually.not.equal(predicted);

      // address predicted for a deployer that is not the factory can be predicted onchain by explicitly providing the deployer
      await expect(
        this.factory.$predictDeterministicAddress(
          this.implementation,
          ethers.Typed.bytes32(salt),
          ethers.Typed.address(deployer),
        ),
      ).to.eventually.equal(predicted);
    });

    it('forwards value to the new clone', async function () {
      await this.admin.sendTransaction({ to: this.factory, value: VALUE, data: '0x' });

      const salt = generators.bytes32();
      const address = await this.factory.$cloneDeterministic.staticCall(
        this.implementation,
        ethers.Typed.bytes32(salt),
        ethers.Typed.uint256(VALUE),
      );
      await this.factory.$cloneDeterministic(
        this.implementation,
        ethers.Typed.bytes32(salt),
        ethers.Typed.uint256(VALUE),
      );

      await expect(ethers.provider.getBalance(address)).to.eventually.equal(VALUE);
      await expect(ethers.provider.getBalance(this.factory)).to.eventually.equal(0n);
    });

    it('reverts when factory balance is below value', async function () {
      const salt = generators.bytes32();
      await expect(
        this.factory.$cloneDeterministic(this.implementation, ethers.Typed.bytes32(salt), ethers.Typed.uint256(VALUE)),
      )
        .to.be.revertedWithCustomError(this.factory, 'InsufficientBalance')
        .withArgs(0n, VALUE);
    });
  });
});
