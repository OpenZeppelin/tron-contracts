// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.4.0) (token/TRC20/utils/TRC1363Utils.sol)

pragma solidity ^0.8.20;

import {ITRC1363Receiver} from "../../../interfaces/ITRC1363Receiver.sol";
import {ITRC1363Spender} from "../../../interfaces/ITRC1363Spender.sol";

/**
 * @dev Library that provides common TRC-1363 utility functions.
 *
 * See https://github.com/tronprotocol/tips/blob/master/tip-1363.md[TIP-1363] (the TRON-side analogue of
 * https://eips.ethereum.org/EIPS/eip-1363[EIP-1363]).
 */
library TRC1363Utils {
    /**
     * @dev Indicates a failure with the token `receiver`. Used in transfers.
     * @param receiver Address to which tokens are being transferred.
     */
    error TRC1363InvalidReceiver(address receiver);

    /**
     * @dev Indicates a failure with the token `spender`. Used in approvals.
     * @param spender Address that may be allowed to operate on tokens without being their owner.
     */
    error TRC1363InvalidSpender(address spender);

    /**
     * @dev Performs a call to {ITRC1363Receiver-onTransferReceived} on a target address.
     *
     * Requirements:
     *
     * - The target has code (i.e. is a contract).
     * - The target `to` must implement the {ITRC1363Receiver} interface.
     * - The target must return the {ITRC1363Receiver-onTransferReceived} selector to accept the transfer.
     */
    function checkOnTRC1363TransferReceived(
        address operator,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            revert TRC1363InvalidReceiver(to);
        }

        try ITRC1363Receiver(to).onTransferReceived(operator, from, value, data) returns (bytes4 retval) {
            if (retval != ITRC1363Receiver.onTransferReceived.selector) {
                revert TRC1363InvalidReceiver(to);
            }
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert TRC1363InvalidReceiver(to);
            } else {
                assembly ("memory-safe") {
                    revert(add(reason, 0x20), mload(reason))
                }
            }
        }
    }

    /**
     * @dev Performs a call to {ITRC1363Spender-onApprovalReceived} on a target address.
     *
     * Requirements:
     *
     * - The target has code (i.e. is a contract).
     * - The target `spender` must implement the {ITRC1363Spender} interface.
     * - The target must return the {ITRC1363Spender-onApprovalReceived} selector to accept the approval.
     */
    function checkOnTRC1363ApprovalReceived(
        address operator,
        address spender,
        uint256 value,
        bytes memory data
    ) internal {
        if (spender.code.length == 0) {
            revert TRC1363InvalidSpender(spender);
        }

        try ITRC1363Spender(spender).onApprovalReceived(operator, value, data) returns (bytes4 retval) {
            if (retval != ITRC1363Spender.onApprovalReceived.selector) {
                revert TRC1363InvalidSpender(spender);
            }
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert TRC1363InvalidSpender(spender);
            } else {
                assembly ("memory-safe") {
                    revert(add(reason, 0x20), mload(reason))
                }
            }
        }
    }
}
