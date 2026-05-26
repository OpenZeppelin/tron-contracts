// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (token/TRC721/utils/TRC721Utils.sol)

pragma solidity ^0.8.20;

import {ITRC721Receiver} from "../ITRC721Receiver.sol";
import {ITRC721Errors} from "../../../interfaces/draft-IERC6093.sol";

/**
 * @dev Library that provides common TRC-721 utility functions.
 *
 * See https://eips.ethereum.org/EIPS/eip-721[TRC-721].
 *
 * _Available since v5.1._
 */
library TRC721Utils {
    /**
     * @dev Performs an acceptance check for the provided `operator` by calling {ITRC721Receiver-onTRC721Received}
     * on the `to` address. The `operator` is generally the address that initiated the token transfer (i.e. `msg.sender`).
     *
     * The acceptance call is not executed and treated as a no-op if the target address doesn't contain code (i.e. an EOA).
     * Otherwise, the recipient must implement {ITRC721Receiver-onTRC721Received} and return the acceptance magic value to accept
     * the transfer.
     */
    function checkOnTRC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal {
        if (to.code.length > 0) {
            try ITRC721Receiver(to).onTRC721Received(operator, from, tokenId, data) returns (bytes4 retval) {
                if (retval != ITRC721Receiver.onTRC721Received.selector) {
                    // Token rejected
                    revert ITRC721Errors.TRC721InvalidReceiver(to);
                }
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    // non-ITRC721Receiver implementer
                    revert ITRC721Errors.TRC721InvalidReceiver(to);
                } else {
                    assembly ("memory-safe") {
                        revert(add(reason, 0x20), mload(reason))
                    }
                }
            }
        }
    }
}
