// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/ITRC3156FlashBorrower.sol)

pragma solidity >=0.5.0;

/**
 * @dev Interface of the TRC-3156 FlashBorrower, as defined in
 * https://github.com/tronprotocol/tips/blob/master/tip-3156.md[TIP-3156] (the TRON-side analogue
 * of https://eips.ethereum.org/EIPS/eip-3156[EIP-3156]).
 */
interface ITRC3156FlashBorrower {
    /**
     * @dev Receive a flash loan.
     * @param initiator The initiator of the loan.
     * @param token The loan currency.
     * @param amount The amount of tokens lent.
     * @param fee The additional amount of tokens to repay.
     * @param data Arbitrary data structure, intended to contain user-defined parameters.
     * @return The keccak256 hash of "TRC3156FlashBorrower.onFlashLoan"
     */
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}
