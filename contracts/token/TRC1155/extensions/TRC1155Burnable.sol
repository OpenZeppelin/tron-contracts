// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.5.0) (token/TRC1155/extensions/TRC1155Burnable.sol)

pragma solidity ^0.8.24;

import {TRC1155} from "../TRC1155.sol";

/**
 * @dev Extension of {TRC1155} that allows token holders to destroy both their
 * own tokens and those that they have been approved to use.
 */
abstract contract TRC1155Burnable is TRC1155 {
    function burn(address account, uint256 id, uint256 value) public virtual {
        _checkAuthorized(_msgSender(), account);
        _burn(account, id, value);
    }

    function burnBatch(address account, uint256[] memory ids, uint256[] memory values) public virtual {
        _checkAuthorized(_msgSender(), account);
        _burnBatch(account, ids, values);
    }
}
