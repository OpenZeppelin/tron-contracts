// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (token/TRC20/utils/SafeTRC20.sol)

pragma solidity ^0.8.20;

import {ITRC20} from "../ITRC20.sol";
import {ITRC1363} from "../../../interfaces/ITRC1363.sol";

/**
 * @title SafeTRC20
 * @dev Wrappers around TRC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeTRC20 for ITRC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 *
 * WARNING: These wrappers are not a token-authenticity check and are intended for contract-based TRC-20 tokens.
 * Because a call returning ABI-encoded `true` (or no data) is treated as success, a code-less address that returns
 * `0x...01` for a TRC-20-shaped call can be reported as a successful operation even though no balance or allowance
 * was modified. Do not treat a `SafeTRC20` "success" as proof of a transfer when the `token` address is untrusted or
 * user-supplied; vet the token first.
 */
library SafeTRC20 {
    /**
     * @dev An operation with a TRC-20 token failed.
     */
    error SafeTRC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeTRC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(ITRC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeTRC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(ITRC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeTRC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     *
     * WARNING: A `false` return value does NOT imply the absence of token-side effects. This helper reports success
     * only when the call does not revert and returns either no data or ABI-encoded `true`. USDT-like tokens that
     * update balances but return ABI-encoded `false` (false-on-success) will therefore make this function return
     * `false` even though the transfer happened. Using `false` to trigger a fallback/retry path with such tokens can
     * double-send or corrupt accounting. For false-on-success tokens use {safeTransferUSDT} (balance-delta
     * verification) instead of relying on this return value.
     */
    function trySafeTransfer(ITRC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(ITRC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`, hardened for tokens such as
     * TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) whose `transfer` returns `false` on a *successful*
     * transfer (while reverting on failure). Such tokens are incorrectly rejected by {safeTransfer}, whose
     * relaxed check only tolerates an empty — not a `false` — return value.
     *
     * NOTE: Only `transfer` is affected on TRON USDT; its `transferFrom` correctly returns `true`, so
     * {safeTransferFrom} already works and no `transferFrom` variant of this helper is needed.
     *
     * Rather than trusting the (unreliable) boolean return value, success is verified by checking that the
     * calling contract's balance decreased by at least `value`. This is correct whether the token returns
     * `true`, `false`, or nothing, and needs no hardcoded token address. Reverts with {SafeTRC20FailedOperation}
     * (or bubbles the token's own revert) on failure.
     *
     * Checking the sender's debit rather than the recipient's credit keeps this correct even if USDT's fee is
     * ever enabled: the sender is always debited the full `value`, while only the recipient would receive less.
     *
     * NOTE: Success here means the calling contract was debited `value`; it does NOT guarantee that `to` received
     * `value`. With a fee-on-transfer token the recipient gets less than `value`, and this function still treats
     * the transfer as successful. A self-transfer (`to == address(this)`) leaves the balance unchanged and is
     * therefore considered successful as long as the call does not revert.
     */
    function safeTransferUSDT(ITRC20 token, address to, uint256 value) internal {
        uint256 balanceBefore = token.balanceOf(address(this));
        // Perform the transfer, bubbling a revert on hard failure, but ignore the returned bool: TRON USDT
        // returns `false` on success. Success is verified below via the sender's balance delta, which (unlike
        // the recipient's) stays correct if USDT's fee is enabled, since the sender is always debited `value`.
        _safeTransfer(token, to, value, true);
        if (to != address(this) && balanceBefore - token.balanceOf(address(this)) < value) {
            revert SafeTRC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements TRC-7674 (TRC-20 with temporary allowance), and if the "client"
     * smart contract uses TRC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(ITRC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements TRC-7674 (TRC-20 with temporary allowance), and if the "client"
     * smart contract uses TRC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(ITRC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeTRC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements TRC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(ITRC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeTRC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeTRC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {TRC1363} transferAndCall, with a fallback to the simple {TRC20} transfer if the target has no
     * code. This can be used to implement a {TRC721}-like safe transfer that relies on {TRC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(ITRC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeTRC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {TRC1363} transferFromAndCall, with a fallback to the simple {TRC20} transferFrom if the target
     * has no code. This can be used to implement a {TRC721}-like safe transfer that relies on {TRC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        ITRC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeTRC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {TRC1363} approveAndCall, with a fallback to the simple {TRC20} approve if the target has no
     * code. This can be used to implement a {TRC721}-like safe transfer that rely on {TRC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {TRC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(ITRC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeTRC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(ITRC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = ITRC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        ITRC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = ITRC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(ITRC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = ITRC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}
