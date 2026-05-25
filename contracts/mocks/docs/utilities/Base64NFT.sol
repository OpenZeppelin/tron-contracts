// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {TRC721} from "../../../token/TRC721/TRC721.sol";
import {Strings} from "../../../utils/Strings.sol";
import {Base64} from "../../../utils/Base64.sol";

contract Base64NFT is TRC721 {
    using Strings for uint256;

    constructor() TRC721("Base64NFT", "MTK") {}

    // ...

    function tokenURI(uint256 tokenId) public pure override returns (string memory) {
        // Equivalent to:
        // {
        //   "name": "Base64NFT #1",
        //   // Replace with extra TRC-721 Metadata properties
        // }
        // prettier-ignore
        string memory dataURI = string.concat("{\"name\": \"Base64NFT #", tokenId.toString(), "\"}");

        return string.concat("data:application/json;base64,", Base64.encode(bytes(dataURI)));
    }
}
