// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {TRC721} from "../../token/TRC721/TRC721.sol";
import {TRC721Consecutive} from "../../token/TRC721/extensions/TRC721Consecutive.sol";
import {TRC721Enumerable} from "../../token/TRC721/extensions/TRC721Enumerable.sol";

contract TRC721ConsecutiveEnumerableMock is TRC721Consecutive, TRC721Enumerable {
    constructor(
        string memory name,
        string memory symbol,
        address[] memory receivers,
        uint96[] memory amounts
    ) TRC721(name, symbol) {
        for (uint256 i = 0; i < receivers.length; ++i) {
            _mintConsecutive(receivers[i], amounts[i]);
        }
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(TRC721, TRC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _ownerOf(uint256 tokenId) internal view virtual override(TRC721, TRC721Consecutive) returns (address) {
        return super._ownerOf(tokenId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(TRC721Consecutive, TRC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount) internal virtual override(TRC721, TRC721Enumerable) {
        super._increaseBalance(account, amount);
    }
}
