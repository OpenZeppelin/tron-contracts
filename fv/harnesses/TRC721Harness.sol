// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC721} from "../patched/token/TRC721/TRC721.sol";

contract TRC721Harness is TRC721 {
    constructor(string memory name, string memory symbol) TRC721(name, symbol) {}

    function mint(address account, uint256 tokenId) external {
        _mint(account, tokenId);
    }

    function safeMint(address to, uint256 tokenId) external {
        _safeMint(to, tokenId);
    }

    function safeMint(address to, uint256 tokenId, bytes memory data) external {
        _safeMint(to, tokenId, data);
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }

    function unsafeBalanceOf(address owner) public view returns (uint256) {
        return _balances[owner];
    }

    function unsafeOwnerOf(uint256 tokenId) external view returns (address) {
        return _ownerOf(tokenId);
    }

    function unsafeGetApproved(uint256 tokenId) external view returns (address) {
        return _getApproved(tokenId);
    }
}
