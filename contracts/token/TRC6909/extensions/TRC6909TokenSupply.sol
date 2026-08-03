// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.6.0) (token/TRC6909/extensions/TRC6909TokenSupply.sol)

pragma solidity ^0.8.20;

import {TRC6909} from "../TRC6909.sol";
import {ITRC6909TokenSupply} from "../../../interfaces/ITRC6909.sol";
import {ITRC165} from "../../../utils/introspection/ITRC165.sol";

/**
 * @dev Implementation of the Token Supply extension defined in TRC6909.
 * Tracks the total supply of each token id individually.
 */
contract TRC6909TokenSupply is TRC6909, ITRC6909TokenSupply {
    mapping(uint256 id => uint256) private _totalSupplies;

    /// @inheritdoc ITRC6909TokenSupply
    function totalSupply(uint256 id) public view virtual override returns (uint256) {
        return _totalSupplies[id];
    }

    /// @inheritdoc ITRC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(TRC6909, ITRC165) returns (bool) {
        return interfaceId == type(ITRC6909TokenSupply).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @dev Override the `_update` function to update the total supply of each token id as necessary.
    function _update(address from, address to, uint256 id, uint256 amount) internal virtual override {
        super._update(from, to, id, amount);

        if (from == address(0)) {
            _totalSupplies[id] += amount;
        }
        if (to == address(0)) {
            unchecked {
                // amount <= _balances[from][id] <= _totalSupplies[id]
                _totalSupplies[id] -= amount;
            }
        }
    }
}
