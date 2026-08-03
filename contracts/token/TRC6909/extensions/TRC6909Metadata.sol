// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.6.0) (token/TRC6909/extensions/TRC6909Metadata.sol)

pragma solidity ^0.8.20;

import {TRC6909} from "../TRC6909.sol";
import {ITRC6909Metadata} from "../../../interfaces/ITRC6909.sol";
import {ITRC165} from "../../../utils/introspection/ITRC165.sol";

/**
 * @dev Implementation of the Metadata extension defined in TRC6909. Exposes the name, symbol, and decimals of each token id.
 */
contract TRC6909Metadata is TRC6909, ITRC6909Metadata {
    struct TokenMetadata {
        string name;
        string symbol;
        uint8 decimals;
    }

    mapping(uint256 id => TokenMetadata) private _tokenMetadata;

    /// @dev The name of the token of type `id` was updated to `newName`.
    event TRC6909NameUpdated(uint256 indexed id, string newName);

    /// @dev The symbol for the token of type `id` was updated to `newSymbol`.
    event TRC6909SymbolUpdated(uint256 indexed id, string newSymbol);

    /// @dev The decimals value for token of type `id` was updated to `newDecimals`.
    event TRC6909DecimalsUpdated(uint256 indexed id, uint8 newDecimals);

    /// @inheritdoc ITRC6909Metadata
    function name(uint256 id) public view virtual override returns (string memory) {
        return _tokenMetadata[id].name;
    }

    /// @inheritdoc ITRC6909Metadata
    function symbol(uint256 id) public view virtual override returns (string memory) {
        return _tokenMetadata[id].symbol;
    }

    /// @inheritdoc ITRC6909Metadata
    function decimals(uint256 id) public view virtual override returns (uint8) {
        return _tokenMetadata[id].decimals;
    }

    /// @inheritdoc ITRC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(TRC6909, ITRC165) returns (bool) {
        return interfaceId == type(ITRC6909Metadata).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Sets the `name` for a given token of type `id`.
     *
     * Emits an {TRC6909NameUpdated} event.
     */
    function _setName(uint256 id, string memory newName) internal virtual {
        _tokenMetadata[id].name = newName;

        emit TRC6909NameUpdated(id, newName);
    }

    /**
     * @dev Sets the `symbol` for a given token of type `id`.
     *
     * Emits an {TRC6909SymbolUpdated} event.
     */
    function _setSymbol(uint256 id, string memory newSymbol) internal virtual {
        _tokenMetadata[id].symbol = newSymbol;

        emit TRC6909SymbolUpdated(id, newSymbol);
    }

    /**
     * @dev Sets the `decimals` for a given token of type `id`.
     *
     * Emits an {TRC6909DecimalsUpdated} event.
     */
    function _setDecimals(uint256 id, uint8 newDecimals) internal virtual {
        _tokenMetadata[id].decimals = newDecimals;

        emit TRC6909DecimalsUpdated(id, newDecimals);
    }
}
