// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.6.0) (token/TRC721/extensions/TRC721URIStorage.sol)

pragma solidity ^0.8.24;

import {TRC721} from "../TRC721.sol";
import {ITRC721Metadata} from "./ITRC721Metadata.sol";
import {ITRC4906} from "../../../interfaces/ITRC4906.sol";
import {ITRC165} from "../../../interfaces/ITRC165.sol";

/**
 * @dev TRC-721 token with storage based token URI management.
 */
abstract contract TRC721URIStorage is ITRC4906, TRC721 {
    // Interface ID as defined in ERC-4906. This does not correspond to a traditional interface ID as ERC-4906 only
    // defines events and does not include any external function.
    bytes4 private constant TRC4906_INTERFACE_ID = bytes4(0x49064906);

    // Optional mapping for token URIs
    mapping(uint256 tokenId => string) private _tokenURIs;

    /// @inheritdoc ITRC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(TRC721, ITRC165) returns (bool) {
        return interfaceId == TRC4906_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc ITRC721Metadata
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);

        string memory base = _baseURI();
        string memory suffix = _suffixURI(tokenId);

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return suffix;
        }
        // If both are set, concatenate the baseURI and tokenURI (via string.concat).
        if (bytes(suffix).length > 0) {
            return string.concat(base, suffix);
        }

        return super.tokenURI(tokenId);
    }

    /**
     * @dev Sets `_tokenURI` as the tokenURI of `tokenId`.
     *
     * Emits {ITRC4906-MetadataUpdate}.
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        _tokenURIs[tokenId] = _tokenURI;
        emit MetadataUpdate(tokenId);
    }

    /**
     * @dev Returns the suffix part of the tokenURI for `tokenId`.
     */
    function _suffixURI(uint256 tokenId) internal view virtual returns (string memory) {
        return _tokenURIs[tokenId];
    }
}
