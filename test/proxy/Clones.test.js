const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const { generators } = require('../helpers/random');

const shouldBehaveLikeClone = require('./Clones.behaviour');

const cloneInitCode = (instance, args = undefined) =>
  args
    ? ethers.concat([
        '0x61',
        ethers.toBeHex(0x2d + ethers.getBytes(args).length, 2),
        '0x3d81600a3d39f3363d3d373d3d3d363d73',
        instance.target ?? instance.address ?? instance,
        '0x5af43d82803e903d91602b57fd5bf3',
        args,
      ])
    : ethers.concat([
        '0x3d602d80600a3d3981f3363d3d373d3d3d363d73',
        instance.target ?? instance.address ?? instance,
        '0x5af43d82803e903d91602b57fd5bf3',
      ]);

async function fixture() {
  const [deployer] = await ethers.getSigners();

  const factory = await ethers.deployContract('$Clones');
  const implementation = await ethers.deployContract('DummyImplementation');

  const newClone =
    args =>
    async (opts = {}) => {
      // EVM derives CREATE addresses from `(sender, nonce)`, so a
      //   `factory.$clone.staticCall(impl).then(addr => impl.attach(addr))`
      // pattern works there — staticCall and the real deploy see the
      // same nonce and return the same address. TVM derives CREATE
      // addresses from `sha3(txHash || sender)` (see
      // WalletUtil.generateContractAddress), so each transaction
      // produces a unique address; staticCall cannot predict the
      // real-deploy address because the tx hashes differ.
      //
      // Deploy first, then attach to the address recorded in the
      // receipt's `internal_transactions` (TVM's per-tx CREATE trace).
      // `cloneDeterministic` (CREATE2) is unaffected — see
      // `newCloneDeterministic` below, which keeps the staticCall
      // pattern because CREATE2's address is `sha3(0x41, sender, salt,
      // codeHash)`, identical across simulations and real txs.
      // EVM fallback: a `staticCall` BEFORE the real deploy predicts the CREATE
      // address there (it doesn't bump the factory nonce, so the real deploy
      // lands at the same `(sender, nonce)`-derived address). On TVM the address
      // is `sha3(txHash || sender)` so this prediction won't match — there we use
      // the receipt's internal-tx trace instead. This keeps the suite runnable on
      // the in-process EVM (e.g. under solidity-coverage), not just on TRE.
      const predicted = await (args
        ? factory.$cloneWithImmutableArgs.staticCall(implementation, args)
        : factory.$clone.staticCall(implementation));
      const tx = await (args
        ? opts.deployValue
          ? factory.$cloneWithImmutableArgs(implementation, args, ethers.Typed.uint256(opts.deployValue))
          : factory.$cloneWithImmutableArgs(implementation, args)
        : opts.deployValue
          ? factory.$clone(implementation, ethers.Typed.uint256(opts.deployValue))
          : factory.$clone(implementation));
      const receipt = await tx.wait();
      // transferTo_address is TVM hex (`41...` prefix + 20-byte body); strip the
      // prefix and re-prefix with `0x` for ethers-compatible attach. Absent (EVM)
      // → fall back to the staticCall-predicted address.
      const internalTx = receipt.internalTransactions && receipt.internalTransactions[0];
      const address =
        internalTx && internalTx.transferTo_address ? '0x' + internalTx.transferTo_address.slice(2) : predicted;
      const clone = implementation.attach(address);
      if (opts.initData || opts.initValue) {
        await deployer.sendTransaction({ to: clone, value: opts.initValue ?? 0n, data: opts.initData ?? '0x' });
      }
      return Object.assign(clone, { deploymentTransaction: () => tx });
    };

  const newCloneDeterministic =
    args =>
    async (opts = {}) => {
      const salt = opts.salt ?? ethers.randomBytes(32);
      const clone = await (
        args
          ? factory.$cloneDeterministicWithImmutableArgs.staticCall(implementation, args, salt)
          : factory.$cloneDeterministic.staticCall(implementation, salt)
      ).then(address => implementation.attach(address));
      const tx = await (args
        ? opts.deployValue
          ? factory.$cloneDeterministicWithImmutableArgs(
              implementation,
              args,
              salt,
              ethers.Typed.uint256(opts.deployValue),
            )
          : factory.$cloneDeterministicWithImmutableArgs(implementation, args, salt)
        : opts.deployValue
          ? factory.$cloneDeterministic(implementation, salt, ethers.Typed.uint256(opts.deployValue))
          : factory.$cloneDeterministic(implementation, salt));
      if (opts.initData || opts.initValue) {
        await deployer.sendTransaction({ to: clone, value: opts.initValue ?? 0n, data: opts.initData ?? '0x' });
      }
      return Object.assign(clone, { deploymentTransaction: () => tx });
    };

  return { deployer, factory, implementation, newClone, newCloneDeterministic };
}

describe('Clones', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  for (const args of [undefined, '0x', '0x11223344']) {
    describe(args ? `with immutable args: ${args}` : 'without immutable args', function () {
      describe('clone', function () {
        beforeEach(async function () {
          this.createClone = this.newClone(args);
        });

        shouldBehaveLikeClone();

        it('get immutable arguments', async function () {
          const instance = await this.createClone();
          expect(await this.factory.$fetchCloneArgs(instance)).to.equal(args ?? '0x');
        });
      });

      describe('cloneDeterministic', function () {
        beforeEach(async function () {
          this.createClone = this.newCloneDeterministic(args);
        });

        shouldBehaveLikeClone();

        it('get immutable arguments', async function () {
          const instance = await this.createClone();
          expect(await this.factory.$fetchCloneArgs(instance)).to.equal(args ?? '0x');
        });

        it('revert if address already used', async function () {
          const salt = ethers.randomBytes(32);

          const deployClone = () =>
            args
              ? this.factory.$cloneDeterministicWithImmutableArgs(this.implementation, args, salt)
              : this.factory.$cloneDeterministic(this.implementation, salt);

          // deploy once
          await expect(deployClone()).to.not.be.reverted;

          // deploy twice — TVM's CREATE2 on a colliding address burns
          // through the full 10M energy budget before the Solidity-side
          // `if (instance == address(0)) revert FailedDeployment()` can
          // emit its custom-error data. The receipt comes back with
          // `result=REVERT, data=0x` even though semantically the
          // FailedDeployment path was hit. Assert the looser `.to.be.
          // reverted` here — we still get a hard failure if the second
          // deploy SUCCEEDS, which is the bug this test guards against.
          await expect(deployClone()).to.be.reverted;
        });

        // [skip-on-coverage] predictDeterministicAddress derives the CREATE2 address with the
        // TVM/TIP-26 0x41 hash prefix; the off-chain expectation (ethers.getCreate2Address) uses
        // the EVM/EIP-1014 0xff prefix. The contract hashes with 0x41 regardless of network, so on
        // the in-process EVM the on-chain prediction can never equal the EVM CREATE2 address — a
        // TVM address-FORMAT property with no EVM equivalent (same as Create2.computeAddress).
        it('address prediction [skip-on-coverage]', async function () {
          const salt = ethers.randomBytes(32);

          const expected = ethers.getCreate2Address(
            this.factory.target,
            salt,
            ethers.keccak256(cloneInitCode(this.implementation, args)),
          );

          if (args) {
            const predicted = await this.factory.$predictDeterministicAddressWithImmutableArgs(
              this.implementation,
              args,
              salt,
            );
            expect(predicted).to.equal(expected);

            await expect(this.factory.$cloneDeterministicWithImmutableArgs(this.implementation, args, salt))
              .to.emit(this.factory, 'return$cloneDeterministicWithImmutableArgs_address_bytes_bytes32')
              .withArgs(predicted);
          } else {
            const predicted = await this.factory.$predictDeterministicAddress(this.implementation, salt);
            expect(predicted).to.equal(expected);

            await expect(this.factory.$cloneDeterministic(this.implementation, salt))
              .to.emit(this.factory, 'return$cloneDeterministic_address_bytes32')
              .withArgs(predicted);
          }
        });
      });
    });
  }

  it('EIP-170 limit on immutable args', async function () {
    // EIP-170 limits the contract code size to 0x6000
    // This limits the length of immutable args to 0x5fd3
    const args = generators.hexBytes(0x5fd4);
    const salt = ethers.randomBytes(32);

    await expect(
      this.factory.$predictDeterministicAddressWithImmutableArgs(this.implementation, args, salt),
    ).to.be.revertedWithCustomError(this.factory, 'CloneArgumentsTooLong');

    await expect(this.factory.$cloneWithImmutableArgs(this.implementation, args)).to.be.revertedWithCustomError(
      this.factory,
      'CloneArgumentsTooLong',
    );
  });
});
