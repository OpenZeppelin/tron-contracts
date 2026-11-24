// contracts/GameItem.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TRC721URIStorage, TRC721} from "../../../../token/TRC721/extensions/TRC721URIStorage.sol";

contract GameItem is TRC721URIStorage {
    uint256 private _nextTokenId;

    constructor() TRC721("GameItem", "ITM") {}

    function awardItem(address player, string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);

        return tokenId;
    }
}
