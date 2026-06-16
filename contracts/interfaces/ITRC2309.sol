// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/ITRC2309.sol)

pragma solidity >=0.4.11;

/**
 * @dev ERC-2309: TRC-721 Consecutive Transfer Extension.
 */
interface ITRC2309 {
    /**
     * @dev Emitted when the tokens from `fromTokenId` to `toTokenId` are transferred from `fromAddress` to `toAddress`.
     */
    event ConsecutiveTransfer(
        uint256 indexed fromTokenId,
        uint256 toTokenId,
        address indexed fromAddress,
        address indexed toAddress
    );
}
