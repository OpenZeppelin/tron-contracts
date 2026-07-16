// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/ITRC777Sender.sol)

pragma solidity >=0.5.0;

/**
 * @dev Interface of the TRC-777 Tokens Sender standard as defined in the ERC.
 *
 * {ITRC777} Token holders can be notified of operations performed on their
 * tokens by having a contract implement this interface (contract holders can be
 * their own implementer) and registering it on the
 * https://eips.ethereum.org/EIPS/eip-1820[ERC-1820 global registry].
 *
 * See {ITRC1820Registry} and {ITRC1820Implementer}.
 */
interface ITRC777Sender {
    /**
     * @dev Called by an {ITRC777} token contract whenever a registered holder's
     * (`from`) tokens are about to be moved or destroyed. The type of operation
     * is conveyed by `to` being the zero address or not.
     *
     * This call occurs _before_ the token contract's state is updated, so
     * {ITRC777-balanceOf}, etc., can be used to query the pre-operation state.
     *
     * This function may revert to prevent the operation from being executed.
     */
    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external;
}
