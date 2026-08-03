// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.5.0) (utils/cryptography/signers/draft-TRC7739.sol)

pragma solidity ^0.8.24;

import {AbstractSigner} from "./AbstractSigner.sol";
import {TIP712} from "../TIP712.sol";
import {TRC7739Utils} from "../draft-TRC7739Utils.sol";
import {ITRC1271} from "../../../interfaces/ITRC1271.sol";
import {MessageHashUtils} from "../MessageHashUtils.sol";

/**
 * @dev Validates signatures wrapping the message hash in a nested TIP712 type. See {TRC7739Utils}.
 *
 * Linking the signature to the TIP-712 domain separator is a security measure to prevent signature replay across different
 * TIP-712 domains (e.g. a single offchain owner of multiple contracts).
 *
 * This contract requires implementing the {_rawSignatureValidation} function, which passes the wrapped message hash,
 * which may be either an typed data or a personal sign nested type.
 *
 * NOTE: Validating a nested typed-data signature reads the TIP-712 domain fields through {eip712Domain}. In the
 * constructor-based xref:api:utils/cryptography#TIP712[TIP712], `name` and `version` are held as
 * xref:api:utils/cryptography#ShortStrings[ShortStrings] when they fit in 31 bytes and in a storage fallback
 * otherwise, so longer values make that read more expensive. The upgradeable variant always reads both from storage.
 */
abstract contract TRC7739 is AbstractSigner, TIP712, ITRC1271 {
    using TRC7739Utils for *;
    using MessageHashUtils for bytes32;

    /**
     * @dev Attempts validating the signature in a nested TIP-712 type.
     *
     * A nested TIP-712 type might be presented in 2 different ways:
     *
     * - As a nested TIP-712 typed data
     * - As a _personal_ signature (a TIP-712 mimic of the `eth_personalSign` for a smart contract)
     */
    function isValidSignature(bytes32 hash, bytes calldata signature) public view virtual returns (bytes4 result) {
        // For the hash `0x7739773977397739773977397739773977397739773977397739773977397739` and an empty signature,
        // we return the magic value `0x77390001` as it's assumed impossible to find a preimage for it that can be used
        // maliciously. Useful for simulation purposes and to validate whether the contract supports TRC-7739.
        return
            (_isValidNestedTypedDataSignature(hash, signature) || _isValidNestedPersonalSignSignature(hash, signature))
                ? ITRC1271.isValidSignature.selector
                : (hash == 0x7739773977397739773977397739773977397739773977397739773977397739 && signature.length == 0)
                    ? bytes4(0x77390001)
                    : bytes4(0xffffffff);
    }

    /**
     * @dev Nested personal signature verification.
     */
    function _isValidNestedPersonalSignSignature(bytes32 hash, bytes calldata signature) private view returns (bool) {
        return _rawSignatureValidation(_domainSeparatorV4().toTypedDataHash(hash.personalSignStructHash()), signature);
    }

    /**
     * @dev Nested TIP-712 typed data verification.
     */
    function _isValidNestedTypedDataSignature(
        bytes32 hash,
        bytes calldata encodedSignature
    ) private view returns (bool) {
        // decode signature
        (
            bytes calldata signature,
            bytes32 appSeparator,
            bytes32 contentsHash,
            string calldata contentsDescr
        ) = encodedSignature.decodeTypedDataSig();

        (
            ,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,

        ) = eip712Domain();

        // A malformed (but non-empty) `contentsDescr` makes `typedDataSignStructHash` return
        // `bytes32(0)`, which would collapse the verified digest to `appSeparator.toTypedDataHash(0)`
        // and drop the binding to `contentsHash` and the account-domain fields. Reject that case.
        bytes32 structHash = TRC7739Utils.typedDataSignStructHash(
            contentsDescr,
            contentsHash,
            abi.encode(keccak256(bytes(name)), keccak256(bytes(version)), chainId, verifyingContract, salt)
        );

        // Check that contentHash and separator are correct
        // Rebuild nested hash
        return
            hash == appSeparator.toTypedDataHash(contentsHash) &&
            bytes(contentsDescr).length != 0 &&
            structHash != bytes32(0) &&
            _rawSignatureValidation(appSeparator.toTypedDataHash(structHash), signature);
    }
}
