// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/TRC20/extensions/TRC20Capped.sol)

pragma solidity ^0.8.20;

import {TRC20} from "../TRC20.sol";

/**
 * @dev Extension of {TRC20} that adds a cap to the supply of tokens.
 */
abstract contract TRC20Capped is TRC20 {
    uint256 private immutable _cap;

    /**
     * @dev Total supply cap has been exceeded.
     */
    error TRC20ExceededCap(uint256 increasedSupply, uint256 cap);

    /**
     * @dev The supplied cap is not a valid cap.
     */
    error TRC20InvalidCap(uint256 cap);

    /**
     * @dev Sets the value of the `cap`. This value is immutable, it can only be
     * set once during construction.
     */
    constructor(uint256 cap_) {
        if (cap_ == 0) {
            revert TRC20InvalidCap(0);
        }
        _cap = cap_;
    }

    /**
     * @dev Returns the cap on the token's total supply.
     */
    function cap() public view virtual returns (uint256) {
        return _cap;
    }

    /// @inheritdoc TRC20
    function _update(address from, address to, uint256 value) internal virtual override {
        super._update(from, to, value);

        if (from == address(0)) {
            uint256 maxSupply = cap();
            uint256 supply = totalSupply();
            if (supply > maxSupply) {
                revert TRC20ExceededCap(supply, maxSupply);
            }
        }
    }
}
