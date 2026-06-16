// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/ITRC4906.sol)

pragma solidity >=0.6.2;

import {ITRC165} from "./ITRC165.sol";
import {ITRC721} from "./ITRC721.sol";

/// @title TRC-721 Metadata Update Extension
interface ITRC4906 is ITRC165, ITRC721 {
    /// @dev This event emits when the metadata of a token is changed.
    /// So that the third-party platforms such as NFT market could
    /// timely update the images and related attributes of the NFT.
    event MetadataUpdate(uint256 _tokenId);

    /// @dev This event emits when the metadata of a range of tokens is changed.
    /// So that the third-party platforms such as NFT market could
    /// timely update the images and related attributes of the NFTs.
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);
}
