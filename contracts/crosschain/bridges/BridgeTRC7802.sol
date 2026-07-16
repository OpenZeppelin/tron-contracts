// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.6.0) (crosschain/bridges/BridgeTRC7802.sol)

pragma solidity ^0.8.26;

import {ITRC7802} from "../../interfaces/draft-ITRC7802.sol";
import {BridgeFungible} from "./abstract/BridgeFungible.sol";

/**
 * @dev This is a variant of {BridgeFungible} that implements the bridge logic for TRC-7802 compliant tokens.
 */
// slither-disable-next-line locked-ether
abstract contract BridgeTRC7802 is BridgeFungible {
    ITRC7802 private immutable _token;

    constructor(ITRC7802 token_) {
        _token = token_;
    }

    /// @dev Return the address of the TRC20 token this bridge operates on.
    function token() public view virtual returns (ITRC7802) {
        return _token;
    }

    /// @dev "Locking" tokens using an TRC-7802 crosschain burn
    function _onSend(address from, uint256 amount) internal virtual override {
        token().crosschainBurn(from, amount);
    }

    /// @dev "Unlocking" tokens using an TRC-7802 crosschain mint
    function _onReceive(address to, uint256 amount) internal virtual override {
        token().crosschainMint(to, amount);
    }
}
