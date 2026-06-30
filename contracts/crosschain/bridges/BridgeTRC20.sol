// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.6.0) (crosschain/bridges/BridgeTRC20.sol)

pragma solidity ^0.8.26;

import {ITRC20, SafeTRC20} from "../../token/TRC20/utils/SafeTRC20.sol";
import {BridgeFungible} from "./abstract/BridgeFungible.sol";

/**
 * @dev This is a variant of {BridgeFungible} that implements the bridge logic for TRC-20 tokens that do not expose a
 * crosschain mint and burn mechanism. Instead, it takes custody of bridged assets.
 */
// slither-disable-next-line locked-ether
abstract contract BridgeTRC20 is BridgeFungible {
    using SafeTRC20 for ITRC20;

    ITRC20 private immutable _token;

    constructor(ITRC20 token_) {
        _token = token_;
    }

    /// @dev Return the address of the TRC20 token this bridge operates on.
    function token() public view virtual returns (ITRC20) {
        return _token;
    }

    /// @dev "Locking" tokens is done by taking custody
    function _onSend(address from, uint256 amount) internal virtual override {
        token().safeTransferFrom(from, address(this), amount);
    }

    /**
     * @dev "Unlocking" tokens is done by releasing custody.
     *
     * Uses {SafeTRC20-safeTransferUSDT} rather than {SafeTRC20-safeTransfer} so the release path also works for
     * tokens such as TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) whose `transfer` returns `false` on a
     * *successful* transfer. {safeTransfer} reverts on such a token; because locking via {_onSend}
     * (`transferFrom`, which USDT returns `true` for) still succeeds, that would let deposits through while
     * permanently trapping every withdrawal in the bridge. {safeTransferUSDT} verifies success by the calling
     * contract's (sender's) balance delta and works whether the token returns `true`, `false`, or nothing.
     *
     * NOTE: As documented on {SafeTRC20-safeTransferUSDT}, this assumes a token that is neither rebasing nor
     * fee-on-transfer; such tokens must not be bridged through this custodial contract.
     */
    function _onReceive(address to, uint256 amount) internal virtual override {
        token().safeTransferUSDT(to, amount);
    }
}
