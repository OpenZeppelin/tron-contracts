// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.4.0) (token/TRC1155/utils/TRC1155Utils.sol)

pragma solidity ^0.8.20;

import {ITRC1155Receiver} from "../ITRC1155Receiver.sol";
import {ITRC1155Errors} from "../../../interfaces/draft-IERC6093.sol";

/**
 * @dev Library that provide common TRC-1155 utility functions.
 *
 * See https://github.com/tronprotocol/tips/blob/master/tip-1155.md[TIP-1155]
 * (the TRON-side analogue of https://eips.ethereum.org/EIPS/eip-1155[EIP-1155]).
 *
 * _Available since v5.1._
 */
library TRC1155Utils {
    /**
     * @dev Performs an acceptance check for the provided `operator` by calling {ITRC1155Receiver-onERC1155Received}
     * on the `to` address. The `operator` is generally the address that initiated the token transfer (i.e. `msg.sender`).
     *
     * The acceptance call is not executed and treated as a no-op if the target address doesn't contain code (i.e. an EOA).
     * Otherwise, the recipient must implement {ITRC1155Receiver-onERC1155Received} and return the acceptance magic value to accept
     * the transfer.
     */
    function checkOnTRC1155Received(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length > 0) {
            try ITRC1155Receiver(to).onERC1155Received(operator, from, id, value, data) returns (bytes4 response) {
                if (response != ITRC1155Receiver.onERC1155Received.selector) {
                    // Tokens rejected
                    revert ITRC1155Errors.TRC1155InvalidReceiver(to);
                }
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    // non-ITRC1155Receiver implementer
                    revert ITRC1155Errors.TRC1155InvalidReceiver(to);
                } else {
                    assembly ("memory-safe") {
                        revert(add(reason, 0x20), mload(reason))
                    }
                }
            }
        }
    }

    /**
     * @dev Performs a batch acceptance check for the provided `operator` by calling {ITRC1155Receiver-onERC1155BatchReceived}
     * on the `to` address. The `operator` is generally the address that initiated the token transfer (i.e. `msg.sender`).
     *
     * The acceptance call is not executed and treated as a no-op if the target address doesn't contain code (i.e. an EOA).
     * Otherwise, the recipient must implement {ITRC1155Receiver-onERC1155Received} and return the acceptance magic value to accept
     * the transfer.
     */
    function checkOnTRC1155BatchReceived(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal {
        if (to.code.length > 0) {
            try ITRC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, values, data) returns (
                bytes4 response
            ) {
                if (response != ITRC1155Receiver.onERC1155BatchReceived.selector) {
                    // Tokens rejected
                    revert ITRC1155Errors.TRC1155InvalidReceiver(to);
                }
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    // non-ITRC1155Receiver implementer
                    revert ITRC1155Errors.TRC1155InvalidReceiver(to);
                } else {
                    assembly ("memory-safe") {
                        revert(add(reason, 0x20), mload(reason))
                    }
                }
            }
        }
    }
}
