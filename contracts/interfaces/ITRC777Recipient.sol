// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.4.0) (interfaces/ITRC777Recipient.sol)

pragma solidity >=0.5.0;

/**
 * @dev Interface of the ERC-777 Tokens Recipient standard as defined in the ERC.
 *
 * Accounts can be notified of {ITRC777} tokens being sent to them by having a
 * contract implement this interface (contract holders can be their own
 * implementer) and registering it on the
 * https://eips.ethereum.org/EIPS/eip-1820[ERC-1820 global registry].
 *
 * See {ITRC1820Registry} and {ITRC1820Implementer}.
 */
interface ITRC777Recipient {
    /**
     * @dev Called by an {ITRC777} token contract whenever tokens are being
     * moved or created into a registered account (`to`). The type of operation
     * is conveyed by `from` being the zero address or not.
     *
     * This call occurs _after_ the token contract's state is updated, so
     * {ITRC777-balanceOf}, etc., can be used to query the post-operation state.
     *
     * This function may revert to prevent the operation from being executed.
     */
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external;
}
