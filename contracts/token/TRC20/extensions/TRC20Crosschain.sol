// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.6.0) (token/TRC20/extensions/TRC20Crosschain.sol)

pragma solidity ^0.8.26;

import {TRC20} from "../TRC20.sol";
import {BridgeFungible} from "../../../crosschain/bridges/abstract/BridgeFungible.sol";

/**
 * @dev Extension of {TRC20} that makes it natively cross-chain using the TRC-7786 based {BridgeFungible}.
 *
 * This extension makes the token compatible with counterparts on other chains, which can be:
 * * {TRC20Crosschain} instances,
 * * {TRC20} instances that are bridged using {BridgeTRC20},
 * * {TRC20Bridgeable} instances that are bridged using {BridgeTRC7802}.
 *
 * It is mostly equivalent to inheriting from both {TRC20Bridgeable} and {BridgeTRC7802}, and configuring them such
 * that:
 * * `token` (on the {BridgeTRC7802} side) is `address(this)`,
 * * `_checkTokenBridge` (on the {TRC20Bridgeable} side) is implemented such that it only accepts self-calls.
 */
// slither-disable-next-line locked-ether
abstract contract TRC20Crosschain is TRC20, BridgeFungible {
    /// @dev Variant of {crosschainTransfer} that allows an authorized account (using TRC20 allowance) to operate on `from`'s assets.
    function crosschainTransferFrom(address from, bytes memory to, uint256 amount) public virtual returns (bytes32) {
        _spendAllowance(from, _msgSender(), amount);
        return _crosschainTransfer(from, to, amount);
    }

    /// @dev "Locking" tokens is achieved through burning
    function _onSend(address from, uint256 amount) internal virtual override {
        _burn(from, amount);
    }

    /// @dev "Unlocking" tokens is achieved through minting
    function _onReceive(address to, uint256 amount) internal virtual override {
        _mint(to, amount);
    }
}
