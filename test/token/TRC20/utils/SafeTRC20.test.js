const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

const name = 'TRC20Mock';
const symbol = 'TRC20Mock';
const value = 100n;
const data = '0x12345678';

async function fixture() {
  const [hasNoCode, owner, receiver, spender, other] = await ethers.getSigners();

  const mock = await ethers.deployContract('$SafeTRC20');
  const trc20ReturnFalseMock = await ethers.deployContract('$TRC20ReturnFalseMock', [name, symbol]);
  const trc20ReturnTrueMock = await ethers.deployContract('$TRC20', [name, symbol]); // default implementation returns true
  const trc20NoReturnMock = await ethers.deployContract('$TRC20NoReturnMock', [name, symbol]);
  const trc20ForceApproveMock = await ethers.deployContract('$TRC20ForceApproveMock', [name, symbol]);
  const trc20UsdtMock = await ethers.deployContract('$TRC20USDTMock', [name, symbol]);
  const trc20UsdtFeeMock = await ethers.deployContract('$TRC20USDTFeeMock', [name, symbol]);
  const erc1363Mock = await ethers.deployContract('$TRC1363', [name, symbol]);
  const erc1363ReturnFalseOnErc20Mock = await ethers.deployContract('$TRC1363ReturnFalseOnTRC20Mock', [name, symbol]);
  const erc1363ReturnFalseMock = await ethers.deployContract('$TRC1363ReturnFalseMock', [name, symbol]);
  const erc1363NoReturnMock = await ethers.deployContract('$TRC1363NoReturnMock', [name, symbol]);
  const erc1363ForceApproveMock = await ethers.deployContract('$TRC1363ForceApproveMock', [name, symbol]);
  const erc1363Receiver = await ethers.deployContract('$TRC1363ReceiverMock');
  const erc1363Spender = await ethers.deployContract('$TRC1363SpenderMock');

  return {
    hasNoCode,
    owner,
    receiver,
    spender,
    other,
    mock,
    trc20ReturnFalseMock,
    trc20ReturnTrueMock,
    trc20NoReturnMock,
    trc20ForceApproveMock,
    trc20UsdtMock,
    trc20UsdtFeeMock,
    erc1363Mock,
    erc1363ReturnFalseOnErc20Mock,
    erc1363ReturnFalseMock,
    erc1363NoReturnMock,
    erc1363ForceApproveMock,
    erc1363Receiver,
    erc1363Spender,
  };
}

describe('SafeTRC20', function () {
  before(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  describe('with address that has no contract code', function () {
    beforeEach(async function () {
      this.token = this.hasNoCode;
    });

    it('reverts on transfer', async function () {
      await expect(this.mock.$safeTransfer(this.token, this.receiver, 0n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });

    it('returns false on trySafeTransfer', async function () {
      await expect(this.mock.$trySafeTransfer(this.token, this.receiver, 0n))
        .to.emit(this.mock, 'return$trySafeTransfer')
        .withArgs(false);
    });

    it('reverts on transferFrom', async function () {
      await expect(this.mock.$safeTransferFrom(this.token, this.mock, this.receiver, 0n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });

    it('returns false on trySafeTransferFrom', async function () {
      await expect(this.mock.$trySafeTransferFrom(this.token, this.mock, this.receiver, 0n))
        .to.emit(this.mock, 'return$trySafeTransferFrom')
        .withArgs(false);
    });

    it('reverts on increaseAllowance', async function () {
      // Call to 'token.allowance' does not return any data, resulting in a decoding error (revert without reason)
      await expect(this.mock.$safeIncreaseAllowance(this.token, this.spender, 0n)).to.be.revertedWithoutReason();
    });

    it('reverts on decreaseAllowance', async function () {
      // Call to 'token.allowance' does not return any data, resulting in a decoding error (revert without reason)
      await expect(this.mock.$safeDecreaseAllowance(this.token, this.spender, 0n)).to.be.revertedWithoutReason();
    });

    it('reverts on forceApprove', async function () {
      await expect(this.mock.$forceApprove(this.token, this.spender, 0n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });
  });

  describe('with token that returns false on all calls', function () {
    beforeEach(async function () {
      this.token = this.trc20ReturnFalseMock;
    });

    it('reverts on transfer', async function () {
      await expect(this.mock.$safeTransfer(this.token, this.receiver, 0n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });

    it('returns false on trySafeTransfer', async function () {
      await expect(this.mock.$trySafeTransfer(this.token, this.receiver, 0n))
        .to.emit(this.mock, 'return$trySafeTransfer')
        .withArgs(false);
    });

    it('reverts on transferFrom', async function () {
      await expect(this.mock.$safeTransferFrom(this.token, this.mock, this.receiver, 0n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });

    it('returns false on trySafeTransferFrom', async function () {
      await expect(this.mock.$trySafeTransferFrom(this.token, this.mock, this.receiver, 0n))
        .to.emit(this.mock, 'return$trySafeTransferFrom')
        .withArgs(false);
    });

    it('reverts on increaseAllowance', async function () {
      await expect(this.mock.$safeIncreaseAllowance(this.token, this.spender, 0n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });

    it('reverts on decreaseAllowance', async function () {
      await expect(this.mock.$safeDecreaseAllowance(this.token, this.spender, 0n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });

    it('reverts on forceApprove', async function () {
      await expect(this.mock.$forceApprove(this.token, this.spender, 0n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });
  });

  describe('with token that returns true on all calls', function () {
    beforeEach(async function () {
      this.token = this.trc20ReturnTrueMock;
    });

    shouldOnlyRevertOnErrors();
  });

  describe('with token that returns no boolean values', function () {
    beforeEach(async function () {
      this.token = this.trc20NoReturnMock;
    });

    shouldOnlyRevertOnErrors();
  });

  describe('with usdt approval behaviour', function () {
    beforeEach(async function () {
      this.token = this.trc20ForceApproveMock;
    });

    describe('with initial approval', function () {
      beforeEach(async function () {
        await this.token.$_approve(this.mock, this.spender, 100n);
      });

      it('safeIncreaseAllowance works', async function () {
        await this.mock.$safeIncreaseAllowance(this.token, this.spender, 10n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(110n);
      });

      it('safeDecreaseAllowance works', async function () {
        await this.mock.$safeDecreaseAllowance(this.token, this.spender, 10n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(90n);
      });

      it('forceApprove works', async function () {
        await this.mock.$forceApprove(this.token, this.spender, 200n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(200n);
      });
    });
  });

  describe('with a USDT-like token that transfers but returns false on success', function () {
    beforeEach(async function () {
      this.token = this.trc20UsdtMock;
      await this.token.$_mint(this.mock, 100n);
      await this.token.$_mint(this.owner, 100n);
      await this.token.$_approve(this.owner, this.mock, ethers.MaxUint256);
    });

    it('safeTransfer reverts because the false return is read as a failure', async function () {
      await expect(this.mock.$safeTransfer(this.token, this.receiver, 10n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });

    it('safeTransferUSDT transfers successfully despite the false return', async function () {
      await expect(this.mock.$safeTransferUSDT(this.token, this.receiver, 10n))
        .to.emit(this.token, 'Transfer')
        .withArgs(this.mock, this.receiver, 10n);
    });

    it('safeTransferUSDT reverts when the underlying transfer reverts', async function () {
      await expect(this.mock.$safeTransferUSDT(this.token, this.receiver, ethers.MaxUint256)).to.be.reverted;
    });

    it('safeTransferFrom works as-is because transferFrom returns true (no USDT variant needed)', async function () {
      await expect(this.mock.$safeTransferFrom(this.token, this.owner, this.receiver, 10n))
        .to.emit(this.token, 'Transfer')
        .withArgs(this.owner, this.receiver, 10n);
    });
  });

  describe('with a USDT-like token that has its transfer fee enabled', function () {
    beforeEach(async function () {
      this.token = this.trc20UsdtFeeMock;
      await this.token.$_mint(this.mock, 100n);
      // 1% fee routed to `other`: the sender is debited the full `value`, the recipient receives `value - fee`.
      await this.token.setFee(100n, this.other);
    });

    it('safeTransferUSDT succeeds even though the recipient receives less than value (fee taken)', async function () {
      // Sender (this.mock) is debited the full 100; recipient gets 99, collector gets 1. A recipient-balance
      // check would reject this; the sender-balance check accepts it.
      await expect(this.mock.$safeTransferUSDT(this.token, this.receiver, 100n))
        .to.emit(this.token, 'Transfer')
        .withArgs(this.mock, this.receiver, 99n)
        .to.emit(this.token, 'Transfer')
        .withArgs(this.mock, this.other, 1n);

      expect(await this.token.balanceOf(this.mock)).to.equal(0n);
      expect(await this.token.balanceOf(this.receiver)).to.equal(99n);
      expect(await this.token.balanceOf(this.other)).to.equal(1n);
    });

    it('safeTransferUSDT reverts when the sender is net-debited less than value (sender is the fee collector)', async function () {
      // Documented edge: if the calling contract itself is the fee collector, the fee is credited back to it,
      // so its net debit is `value - fee < value` and the check rejects the (otherwise successful) transfer.
      // This requires the calling contract to be the token's fee owner, so it is not a real-world concern.
      await this.token.setFee(100n, this.mock);
      await expect(this.mock.$safeTransferUSDT(this.token, this.receiver, 100n))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });
  });

  describe('with standard TRC1363', function () {
    beforeEach(async function () {
      this.token = this.erc1363Mock;
    });

    shouldOnlyRevertOnErrors();

    describe('transferAndCall', function () {
      it('cannot transferAndCall to an EOA directly', async function () {
        await this.token.$_mint(this.owner, 100n);

        await expect(this.token.connect(this.owner).transferAndCall(this.receiver, value, ethers.Typed.bytes(data)))
          .to.be.revertedWithCustomError(this.token, 'TRC1363InvalidReceiver')
          .withArgs(this.receiver);
      });

      it('can transferAndCall to an EOA using helper', async function () {
        await this.token.$_mint(this.mock, value);

        await expect(this.mock.$transferAndCallRelaxed(this.token, this.receiver, value, data))
          .to.emit(this.token, 'Transfer')
          .withArgs(this.mock, this.receiver, value);
      });

      it('can transferAndCall to an TRC1363Receiver using helper', async function () {
        await this.token.$_mint(this.mock, value);

        await expect(this.mock.$transferAndCallRelaxed(this.token, this.erc1363Receiver, value, data))
          .to.emit(this.token, 'Transfer')
          .withArgs(this.mock, this.erc1363Receiver, value)
          .to.emit(this.erc1363Receiver, 'Received')
          .withArgs(this.mock, this.mock, value, data);
      });
    });

    describe('transferFromAndCall', function () {
      it('can transferFromAndCall to an EOA using helper', async function () {
        await this.token.$_mint(this.owner, value);
        await this.token.$_approve(this.owner, this.mock, ethers.MaxUint256);

        await expect(this.mock.$transferFromAndCallRelaxed(this.token, this.owner, this.receiver, value, data))
          .to.emit(this.token, 'Transfer')
          .withArgs(this.owner, this.receiver, value);
      });

      it('can transferFromAndCall to an TRC1363Receiver using helper', async function () {
        await this.token.$_mint(this.owner, value);
        await this.token.$_approve(this.owner, this.mock, ethers.MaxUint256);

        await expect(this.mock.$transferFromAndCallRelaxed(this.token, this.owner, this.erc1363Receiver, value, data))
          .to.emit(this.token, 'Transfer')
          .withArgs(this.owner, this.erc1363Receiver, value)
          .to.emit(this.erc1363Receiver, 'Received')
          .withArgs(this.mock, this.owner, value, data);
      });
    });

    describe('approveAndCall', function () {
      it('can approveAndCall to an EOA using helper', async function () {
        await expect(this.mock.$approveAndCallRelaxed(this.token, this.receiver, value, data))
          .to.emit(this.token, 'Approval')
          .withArgs(this.mock, this.receiver, value);
      });

      it('can approveAndCall to an TRC1363Spender using helper', async function () {
        await expect(this.mock.$approveAndCallRelaxed(this.token, this.erc1363Spender, value, data))
          .to.emit(this.token, 'Approval')
          .withArgs(this.mock, this.erc1363Spender, value)
          .to.emit(this.erc1363Spender, 'Approved')
          .withArgs(this.mock, value, data);
      });
    });
  });

  describe('with TRC1363 that returns false on all TRC20 calls', function () {
    beforeEach(async function () {
      this.token = this.erc1363ReturnFalseOnErc20Mock;
    });

    it('reverts on transferAndCallRelaxed', async function () {
      await expect(this.mock.$transferAndCallRelaxed(this.token, this.erc1363Receiver, 0n, data))
        .to.be.revertedWithCustomError(this.token, 'TRC1363TransferFailed')
        .withArgs(this.erc1363Receiver, 0n);
    });

    it('reverts on transferFromAndCallRelaxed', async function () {
      await expect(this.mock.$transferFromAndCallRelaxed(this.token, this.mock, this.erc1363Receiver, 0n, data))
        .to.be.revertedWithCustomError(this.token, 'TRC1363TransferFromFailed')
        .withArgs(this.mock, this.erc1363Receiver, 0n);
    });

    it('reverts on approveAndCallRelaxed', async function () {
      await expect(this.mock.$approveAndCallRelaxed(this.token, this.erc1363Spender, 0n, data))
        .to.be.revertedWithCustomError(this.token, 'TRC1363ApproveFailed')
        .withArgs(this.erc1363Spender, 0n);
    });
  });

  describe('with TRC1363 that returns false on all TRC1363 calls', function () {
    beforeEach(async function () {
      this.token = this.erc1363ReturnFalseMock;
    });

    it('reverts on transferAndCallRelaxed', async function () {
      await expect(this.mock.$transferAndCallRelaxed(this.token, this.erc1363Receiver, 0n, data))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });

    it('reverts on transferFromAndCallRelaxed', async function () {
      await expect(this.mock.$transferFromAndCallRelaxed(this.token, this.mock, this.erc1363Receiver, 0n, data))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });

    it('reverts on approveAndCallRelaxed', async function () {
      await expect(this.mock.$approveAndCallRelaxed(this.token, this.erc1363Spender, 0n, data))
        .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedOperation')
        .withArgs(this.token);
    });
  });

  describe('with TRC1363 that returns no boolean values', function () {
    beforeEach(async function () {
      this.token = this.erc1363NoReturnMock;
    });

    it('reverts on transferAndCallRelaxed', async function () {
      await expect(
        this.mock.$transferAndCallRelaxed(this.token, this.erc1363Receiver, 0n, data),
      ).to.be.revertedWithoutReason();
    });

    it('reverts on transferFromAndCallRelaxed', async function () {
      await expect(
        this.mock.$transferFromAndCallRelaxed(this.token, this.mock, this.erc1363Receiver, 0n, data),
      ).to.be.revertedWithoutReason();
    });

    it('reverts on approveAndCallRelaxed', async function () {
      await expect(
        this.mock.$approveAndCallRelaxed(this.token, this.erc1363Spender, 0n, data),
      ).to.be.revertedWithoutReason();
    });
  });

  describe('with TRC1363 with usdt approval behaviour', function () {
    beforeEach(async function () {
      this.token = this.erc1363ForceApproveMock;
    });

    describe('without initial approval', function () {
      it('approveAndCallRelaxed works when recipient is an EOA', async function () {
        await this.mock.$approveAndCallRelaxed(this.token, this.spender, 10n, data);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(10n);
      });

      it('approveAndCallRelaxed works when recipient is a contract', async function () {
        await this.mock.$approveAndCallRelaxed(this.token, this.erc1363Spender, 10n, data);
        expect(await this.token.allowance(this.mock, this.erc1363Spender)).to.equal(10n);
      });
    });

    describe('with initial approval', function () {
      it('approveAndCallRelaxed works when recipient is an EOA', async function () {
        await this.token.$_approve(this.mock, this.spender, 100n);

        await this.mock.$approveAndCallRelaxed(this.token, this.spender, 10n, data);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(10n);
      });

      it('approveAndCallRelaxed reverts when recipient is a contract', async function () {
        await this.token.$_approve(this.mock, this.erc1363Spender, 100n);
        await expect(this.mock.$approveAndCallRelaxed(this.token, this.erc1363Spender, 10n, data)).to.be.revertedWith(
          'USDT approval failure',
        );
      });
    });
  });
});

function shouldOnlyRevertOnErrors() {
  describe('transfers', function () {
    beforeEach(async function () {
      await this.token.$_mint(this.owner, 100n);
      await this.token.$_mint(this.mock, 100n);
      await this.token.$_approve(this.owner, this.mock, ethers.MaxUint256);
    });

    it("doesn't revert on transfer", async function () {
      await expect(this.mock.$safeTransfer(this.token, this.receiver, 10n))
        .to.emit(this.token, 'Transfer')
        .withArgs(this.mock, this.receiver, 10n);
    });

    it('returns true on trySafeTransfer', async function () {
      await expect(this.mock.$trySafeTransfer(this.token, this.receiver, 10n))
        .to.emit(this.mock, 'return$trySafeTransfer')
        .withArgs(true);
    });

    it("doesn't revert on transferFrom", async function () {
      await expect(this.mock.$safeTransferFrom(this.token, this.owner, this.receiver, 10n))
        .to.emit(this.token, 'Transfer')
        .withArgs(this.owner, this.receiver, 10n);
    });

    it('returns true on trySafeTransferFrom', async function () {
      await expect(this.mock.$trySafeTransferFrom(this.token, this.owner, this.receiver, 10n))
        .to.emit(this.mock, 'return$trySafeTransferFrom')
        .withArgs(true);
    });
  });

  describe('approvals', function () {
    describe('with zero allowance', function () {
      beforeEach(async function () {
        await this.token.$_approve(this.mock, this.spender, 0n);
      });

      it("doesn't revert when force approving a non-zero allowance", async function () {
        await this.mock.$forceApprove(this.token, this.spender, 100n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(100n);
      });

      it("doesn't revert when force approving a zero allowance", async function () {
        await this.mock.$forceApprove(this.token, this.spender, 0n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(0n);
      });

      it("doesn't revert when increasing the allowance", async function () {
        await this.mock.$safeIncreaseAllowance(this.token, this.spender, 10n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(10n);
      });

      it('reverts when decreasing the allowance', async function () {
        await expect(this.mock.$safeDecreaseAllowance(this.token, this.spender, 10n))
          .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedDecreaseAllowance')
          .withArgs(this.spender, 0n, 10n);
      });
    });

    describe('with non-zero allowance', function () {
      beforeEach(async function () {
        await this.token.$_approve(this.mock, this.spender, 100n);
      });

      it("doesn't revert when force approving a non-zero allowance", async function () {
        await this.mock.$forceApprove(this.token, this.spender, 20n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(20n);
      });

      it("doesn't revert when force approving a zero allowance", async function () {
        await this.mock.$forceApprove(this.token, this.spender, 0n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(0n);
      });

      it("doesn't revert when increasing the allowance", async function () {
        await this.mock.$safeIncreaseAllowance(this.token, this.spender, 10n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(110n);
      });

      it("doesn't revert when decreasing the allowance to a positive value", async function () {
        await this.mock.$safeDecreaseAllowance(this.token, this.spender, 50n);
        expect(await this.token.allowance(this.mock, this.spender)).to.equal(50n);
      });

      it('reverts when decreasing the allowance to a negative value', async function () {
        await expect(this.mock.$safeDecreaseAllowance(this.token, this.spender, 200n))
          .to.be.revertedWithCustomError(this.mock, 'SafeTRC20FailedDecreaseAllowance')
          .withArgs(this.spender, 100n, 200n);
      });
    });
  });
}
