// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.6.0) (token/TRC6909/extensions/TRC6909ContentURI.sol)

pragma solidity ^0.8.20;

import {TRC6909} from "../TRC6909.sol";
import {ITRC6909ContentURI} from "../../../interfaces/ITRC6909.sol";
import {ITRC165} from "../../../utils/introspection/ITRC165.sol";

/**
 * @dev Implementation of the Content URI extension defined in TRC6909.
 */
contract TRC6909ContentURI is TRC6909, ITRC6909ContentURI {
    string private _contractURI;
    mapping(uint256 id => string) private _tokenURIs;

    /// @dev Event emitted when the contract URI is changed. See https://eips.ethereum.org/EIPS/eip-7572[ERC-7572] for details.
    event ContractURIUpdated();

    /// @dev See {ITRC1155-URI}
    event URI(string value, uint256 indexed id);

    /// @inheritdoc ITRC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(TRC6909, ITRC165) returns (bool) {
        return interfaceId == type(ITRC6909ContentURI).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc ITRC6909ContentURI
    function contractURI() public view virtual override returns (string memory) {
        return _contractURI;
    }

    /// @inheritdoc ITRC6909ContentURI
    function tokenURI(uint256 id) public view virtual override returns (string memory) {
        return _tokenURIs[id];
    }

    /**
     * @dev Sets the {contractURI} for the contract.
     *
     * Emits a {ContractURIUpdated} event.
     */
    function _setContractURI(string memory newContractURI) internal virtual {
        _contractURI = newContractURI;

        emit ContractURIUpdated();
    }

    /**
     * @dev Sets the {tokenURI} for a given token of type `id`.
     *
     * Emits a {URI} event.
     */
    function _setTokenURI(uint256 id, string memory newTokenURI) internal virtual {
        _tokenURIs[id] = newTokenURI;

        emit URI(newTokenURI, id);
    }
}
