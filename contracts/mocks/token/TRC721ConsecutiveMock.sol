// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {TRC721} from "../../token/TRC721/TRC721.sol";
import {TRC721Consecutive} from "../../token/TRC721/extensions/TRC721Consecutive.sol";
import {TRC721Pausable} from "../../token/TRC721/extensions/TRC721Pausable.sol";
import {TRC721Votes} from "../../token/TRC721/extensions/TRC721Votes.sol";
import {EIP712} from "../../utils/cryptography/EIP712.sol";

/**
 * @title TRC721ConsecutiveMock
 */
contract TRC721ConsecutiveMock is TRC721Consecutive, TRC721Pausable, TRC721Votes {
    uint96 private immutable _offset;

    constructor(
        string memory name,
        string memory symbol,
        uint96 offset,
        address[] memory delegates,
        address[] memory receivers,
        uint96[] memory amounts
    ) TRC721(name, symbol) EIP712(name, "1") {
        _offset = offset;

        for (uint256 i = 0; i < delegates.length; ++i) {
            _delegate(delegates[i], delegates[i]);
        }

        for (uint256 i = 0; i < receivers.length; ++i) {
            _mintConsecutive(receivers[i], amounts[i]);
        }
    }

    function _firstConsecutiveId() internal view virtual override returns (uint96) {
        return _offset;
    }

    function _ownerOf(uint256 tokenId) internal view virtual override(TRC721, TRC721Consecutive) returns (address) {
        return super._ownerOf(tokenId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(TRC721Consecutive, TRC721Pausable, TRC721Votes) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount) internal virtual override(TRC721, TRC721Votes) {
        super._increaseBalance(account, amount);
    }
}

contract TRC721ConsecutiveNoConstructorMintMock is TRC721Consecutive {
    constructor(string memory name, string memory symbol) TRC721(name, symbol) {
        _mint(msg.sender, 0);
    }
}
