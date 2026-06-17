// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/TRC20/extensions/TRC1363.sol)

pragma solidity ^0.8.20;

import {TRC20} from "../TRC20.sol";
import {ITRC165, TRC165} from "../../../utils/introspection/TRC165.sol";
import {ITRC1363} from "../../../interfaces/ITRC1363.sol";
import {TRC1363Utils} from "../utils/TRC1363Utils.sol";

/**
 * @title TRC1363
 * @dev Extension of {TRC20} tokens that adds support for code execution after transfers and approvals
 * on recipient contracts. Calls after transfers are enabled through the {TRC1363-transferAndCall} and
 * {TRC1363-transferFromAndCall} methods while calls after approvals can be made with {TRC1363-approveAndCall}
 *
 * _Available since v5.1._
 */
abstract contract TRC1363 is TRC20, TRC165, ITRC1363 {
    /**
     * @dev Indicates a failure within the {transfer} part of a transferAndCall operation.
     * @param receiver Address to which tokens are being transferred.
     * @param value Amount of tokens to be transferred.
     */
    error TRC1363TransferFailed(address receiver, uint256 value);

    /**
     * @dev Indicates a failure within the {transferFrom} part of a transferFromAndCall operation.
     * @param sender Address from which to send tokens.
     * @param receiver Address to which tokens are being transferred.
     * @param value Amount of tokens to be transferred.
     */
    error TRC1363TransferFromFailed(address sender, address receiver, uint256 value);

    /**
     * @dev Indicates a failure within the {approve} part of a approveAndCall operation.
     * @param spender Address which will spend the funds.
     * @param value Amount of tokens to be spent.
     */
    error TRC1363ApproveFailed(address spender, uint256 value);

    /// @inheritdoc ITRC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(TRC165, ITRC165) returns (bool) {
        return interfaceId == type(ITRC1363).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {ITRC1363Receiver-onTransferReceived} on `to`. Returns a flag that indicates
     * if the call succeeded.
     *
     * Requirements:
     *
     * - The target has code (i.e. is a contract).
     * - The target `to` must implement the {ITRC1363Receiver} interface.
     * - The target must return the {ITRC1363Receiver-onTransferReceived} selector to accept the transfer.
     * - The internal {transfer} must succeed (returned `true`).
     */
    function transferAndCall(address to, uint256 value) public returns (bool) {
        return transferAndCall(to, value, "");
    }

    /**
     * @dev Variant of {transferAndCall} that accepts an additional `data` parameter with
     * no specified format.
     */
    function transferAndCall(address to, uint256 value, bytes memory data) public virtual returns (bool) {
        if (!transfer(to, value)) {
            revert TRC1363TransferFailed(to, value);
        }
        TRC1363Utils.checkOnTRC1363TransferReceived(_msgSender(), _msgSender(), to, value, data);
        return true;
    }

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {ITRC1363Receiver-onTransferReceived} on `to`. Returns a flag that indicates
     * if the call succeeded.
     *
     * Requirements:
     *
     * - The target has code (i.e. is a contract).
     * - The target `to` must implement the {ITRC1363Receiver} interface.
     * - The target must return the {ITRC1363Receiver-onTransferReceived} selector to accept the transfer.
     * - The internal {transferFrom} must succeed (returned `true`).
     */
    function transferFromAndCall(address from, address to, uint256 value) public returns (bool) {
        return transferFromAndCall(from, to, value, "");
    }

    /**
     * @dev Variant of {transferFromAndCall} that accepts an additional `data` parameter with
     * no specified format.
     */
    function transferFromAndCall(
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) public virtual returns (bool) {
        if (!transferFrom(from, to, value)) {
            revert TRC1363TransferFromFailed(from, to, value);
        }
        TRC1363Utils.checkOnTRC1363TransferReceived(_msgSender(), from, to, value, data);
        return true;
    }

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {ITRC1363Spender-onApprovalReceived} on `spender`.
     * Returns a flag that indicates if the call succeeded.
     *
     * Requirements:
     *
     * - The target has code (i.e. is a contract).
     * - The target `spender` must implement the {ITRC1363Spender} interface.
     * - The target must return the {ITRC1363Spender-onApprovalReceived} selector to accept the approval.
     * - The internal {approve} must succeed (returned `true`).
     */
    function approveAndCall(address spender, uint256 value) public returns (bool) {
        return approveAndCall(spender, value, "");
    }

    /**
     * @dev Variant of {approveAndCall} that accepts an additional `data` parameter with
     * no specified format.
     */
    function approveAndCall(address spender, uint256 value, bytes memory data) public virtual returns (bool) {
        if (!approve(spender, value)) {
            revert TRC1363ApproveFailed(spender, value);
        }
        TRC1363Utils.checkOnTRC1363ApprovalReceived(_msgSender(), spender, value, data);
        return true;
    }
}
