// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/**
 * @dev Library for accessing historical block hashes.
 *
 * Uses the native `BLOCKHASH` opcode, which exposes the hashes of the most
 * recent 256 blocks. Queries for blocks outside that window — older than 256
 * blocks, the current block, or any future block — return zero, matching the
 * opcode's behavior.
 */
library Blockhash {
    /**
     * @dev Retrieves the block hash for a historical block.
     *
     * NOTE: The function gracefully handles future blocks and blocks beyond the
     * 256-block window by returning zero, consistent with the EVM's native
     * `BLOCKHASH` behavior.
     */
    function blockHash(uint256 blockNumber) internal view returns (bytes32) {
        return blockhash(blockNumber);
    }
}
