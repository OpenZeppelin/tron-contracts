// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {TRC721URIStorage} from "../../token/TRC721/extensions/TRC721URIStorage.sol";

abstract contract TRC721URIStorageMock is TRC721URIStorage {
    string private _baseTokenURI;

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata newBaseTokenURI) public {
        _baseTokenURI = newBaseTokenURI;
    }
}
