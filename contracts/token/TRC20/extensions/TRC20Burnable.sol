// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (token/TRC20/extensions/TRC20Burnable.sol)

pragma solidity ^0.8.20;

import {TRC20} from "../TRC20.sol";
import {Context} from "../../../utils/Context.sol";

/**
 * @dev Extension of {TRC20} that allows token holders to destroy both their own
 * tokens and those that they have an allowance for, in a way that can be
 * recognized off-chain (via event analysis).
 */
abstract contract TRC20Burnable is Context, TRC20 {
    /**
     * @dev Destroys a `value` amount of tokens from the caller.
     *
     * See {TRC20-_burn}.
     */
    function burn(uint256 value) public virtual {
        _burn(_msgSender(), value);
    }

    /**
     * @dev Destroys a `value` amount of tokens from `account`, deducting from
     * the caller's allowance.
     *
     * See {TRC20-_burn} and {TRC20-allowance}.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `value`.
     */
    function burnFrom(address account, uint256 value) public virtual {
        _spendAllowance(account, _msgSender(), value);
        _burn(account, value);
    }
}
