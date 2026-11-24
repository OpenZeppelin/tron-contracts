// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TRC721} from "@openzeppelin/tron-contracts/token/TRC721/TRC721.sol";

contract MyNFT is TRC721 {
    constructor() TRC721("MyNFT", "MNFT") {}
}
