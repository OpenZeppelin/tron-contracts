// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.6.0) (token/TRC20/extensions/TRC20Wrapper.sol)

pragma solidity ^0.8.20;

import {ITRC20, ITRC20Metadata, TRC20} from "../TRC20.sol";
import {SafeTRC20} from "../utils/SafeTRC20.sol";

/**
 * @dev Extension of the TRC-20 token contract to support token wrapping.
 *
 * Users can deposit and withdraw "underlying tokens" and receive a matching number of "wrapped tokens". This is useful
 * in conjunction with other modules. For example, combining this wrapping mechanism with {TRC20Votes} will allow the
 * wrapping of an existing "basic" TRC-20 into a governance token.
 *
 * WARNING: Any mechanism in which the underlying token changes the {balanceOf} of an account without an explicit transfer
 * may desynchronize this contract's supply and its underlying balance. Please exercise caution when wrapping tokens that
 * may undercollateralize the wrapper (i.e. wrapper's total supply is higher than its underlying balance). See {_recover}
 * for recovering value accrued to the wrapper.
 */
abstract contract TRC20Wrapper is TRC20 {
    ITRC20 private immutable _underlying;

    /**
     * @dev The underlying token couldn't be wrapped.
     */
    error TRC20InvalidUnderlying(address token);

    constructor(ITRC20 underlyingToken) {
        if (address(underlyingToken) == address(this)) {
            revert TRC20InvalidUnderlying(address(this));
        }
        _underlying = underlyingToken;
    }

    /// @inheritdoc ITRC20Metadata
    function decimals() public view virtual override returns (uint8) {
        try ITRC20Metadata(address(_underlying)).decimals() returns (uint8 value) {
            return value;
        } catch {
            return super.decimals();
        }
    }

    /**
     * @dev Returns the address of the underlying TRC-20 token that is being wrapped.
     */
    function underlying() public view returns (ITRC20) {
        return _underlying;
    }

    /**
     * @dev Allow a user to deposit underlying tokens and mint the corresponding number of wrapped tokens.
     */
    function depositFor(address account, uint256 value) public virtual returns (bool) {
        address sender = _msgSender();
        if (sender == address(this)) {
            revert TRC20InvalidSender(address(this));
        }
        if (account == address(this)) {
            revert TRC20InvalidReceiver(account);
        }
        SafeTRC20.safeTransferFrom(_underlying, sender, address(this), value);
        _mint(account, value);
        return true;
    }

    /**
     * @dev Allow a user to burn a number of wrapped tokens and withdraw the corresponding number of underlying tokens.
     */
    function withdrawTo(address account, uint256 value) public virtual returns (bool) {
        if (account == address(this)) {
            revert TRC20InvalidReceiver(account);
        }
        _burn(_msgSender(), value);
        SafeTRC20.safeTransfer(_underlying, account, value);
        return true;
    }

    /**
     * @dev Mint wrapped token to cover any underlyingTokens that would have been transferred by mistake or acquired from
     * rebasing mechanisms. Internal function that can be exposed with access control if desired.
     */
    function _recover(address account) internal virtual returns (uint256) {
        uint256 value = _underlying.balanceOf(address(this)) - totalSupply();
        _mint(account, value);
        return value;
    }
}
