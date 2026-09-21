const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const value = 42n;

async function fixture() {
  const [receiver, other] = await ethers.getSigners();

  const mock = await ethers.deployContract('$SimulateCall');
  // `ethers.getCreate2Address` is patched by hardhat-tron to hash with the
  // TVM TIP-26 `0x41` prefix (matching `SimulateCall.getSimulator`'s hardcoded
  // `mstore8(0x0b, 0x41)`), so on the `tre` network this resolves to the
  // simulator's actual deployment address.
  const simulator = ethers.getCreate2Address(
    mock.target,
    ethers.ZeroHash,
    ethers.keccak256(
      ethers.concat([
        '0x60315f8160095f39f3',
        '0x60333611600a575f5ffd5b6034360360345f375f5f603436035f6014355f3560601c5af13d5f5f3e5f3d91602f57f35bfd',
      ]),
    ),
  );

  const target = await ethers.deployContract('$CallReceiverMock');

  // fund the mock contract (for tests that use value)
  await other.sendTransaction({ to: mock, value, data: '0x' });

  return { mock, target, receiver, other, simulator };
}

describe('SimulateCall', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  // [skip-on-coverage] The simulator address is derived from a CREATE2
  // computation hardcoded in SimulateCall.sol to the TVM TIP-26 prefix 0x41
  // (`mstore8(0x0b, 0x41)`), not the EVM 0xff. On the in-process EVM the
  // contract still computes/returns the 0x41-derived address while the EVM
  // `create2` opcode actually deploys at the 0xff-derived address — so the
  // contract emits one address and code lands at a different one. The contract
  // cannot be changed (it must stay 0x41 for TVM), and no test-side prediction
  // can reconcile this. This is the TVM-only CREATE2-prefix format case with no
  // EVM equivalent.
  it('automatic simulator deployment [skip-on-coverage]', async function () {
    await expect(ethers.provider.getCode(this.simulator)).to.eventually.equal('0x');

    // First call performs deployment
    await expect(this.mock.$getSimulator()).to.emit(this.mock, 'return$getSimulator').withArgs(this.simulator);

    await expect(ethers.provider.getCode(this.simulator)).to.eventually.not.equal('0x');

    // Following calls use the same simulator
    await expect(this.mock.$getSimulator()).to.emit(this.mock, 'return$getSimulator').withArgs(this.simulator);
  });

  // [skip-on-coverage] Unrunnable on the in-process EVM: `getSimulator` returns
  // the 0x41-derived address (hardcoded for TVM), but the EVM `create2` opcode
  // deploys the simulator at the 0xff-derived address. So the delegatecall in
  // `simulateCall` hits the (empty) 0x41 address — the simulator code never
  // runs, the target is never called, and the inverted-success protocol yields
  // a bogus `(false, 0x)`. The contract can't be changed (0x41 is required on
  // TVM) and there is no test-side EVM equivalent for delegatecalling a
  // hardcoded TVM-prefixed address.
  describe('simulated call [skip-on-coverage]', function () {
    it('target success', async function () {
      const txPromise = this.mock.$simulateCall(
        ethers.Typed.address(this.target),
        ethers.Typed.bytes(this.target.interface.encodeFunctionData('mockFunctionWithArgsReturn', [10, 20])),
      );

      await expect(txPromise).to.changeEtherBalances([this.mock, this.simulator, this.target], [0n, 0n, 0n]);
      await expect(txPromise)
        .to.emit(this.mock, 'return$simulateCall_address_bytes')
        .withArgs(true, ethers.AbiCoder.defaultAbiCoder().encode(['uint256', 'uint256'], [10, 20]))
        .to.not.emit(this.target, 'MockFunctionCalledWithArgs');
    });

    it('target success (with value)', async function () {
      // perform simulated call
      const txPromise = this.mock.$simulateCall(
        ethers.Typed.address(this.target),
        ethers.Typed.uint256(value),
        ethers.Typed.bytes(this.target.interface.encodeFunctionData('mockFunctionExtra')),
      );

      await expect(txPromise).to.changeEtherBalances([this.mock, this.simulator, this.target], [0n, 0n, 0n]);
      await expect(txPromise)
        .to.emit(this.mock, 'return$simulateCall_address_uint256_bytes')
        .withArgs(true, ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [this.mock.target, value]))
        .to.not.emit(this.target, 'MockFunctionCalledExtra');
    });

    it('target revert', async function () {
      const txPromise = this.mock.$simulateCall(
        ethers.Typed.address(this.target),
        ethers.Typed.bytes(this.target.interface.encodeFunctionData('mockFunctionRevertsReason')),
      );

      await expect(txPromise).to.changeEtherBalances([this.mock, this.simulator, this.target], [0n, 0n, 0n]);
      await expect(txPromise)
        .to.emit(this.mock, 'return$simulateCall_address_bytes')
        .withArgs(false, this.target.interface.encodeErrorResult('Error', ['CallReceiverMock: reverting']));
    });

    it('target revert (with value)', async function () {
      const txPromise = this.mock.$simulateCall(
        ethers.Typed.address(this.target),
        ethers.Typed.uint256(value),
        ethers.Typed.bytes(this.target.interface.encodeFunctionData('mockFunctionRevertsReason')),
      );

      await expect(txPromise).to.changeEtherBalances([this.mock, this.simulator, this.target], [0n, 0n, 0n]);
      await expect(txPromise)
        .to.emit(this.mock, 'return$simulateCall_address_uint256_bytes')
        .withArgs(false, this.target.interface.encodeErrorResult('Error', ['CallReceiverMock: reverting']));
    });
  });
});
