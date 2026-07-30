// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.5.0) (utils/cryptography/verifiers/TRC7913RSAVerifier.sol)

pragma solidity ^0.8.20;

import {RSA} from "../RSA.sol";
import {ITRC7913SignatureVerifier} from "../../../interfaces/ITRC7913.sol";

/**
 * @dev TRC-7913 signature verifier that support RSA keys.
 *
 * @custom:stateless
 */
contract TRC7913RSAVerifier is ITRC7913SignatureVerifier {
    /// @inheritdoc ITRC7913SignatureVerifier
    function verify(bytes calldata key, bytes32 hash, bytes calldata signature) public view virtual returns (bytes4) {
        (bytes memory e, bytes memory n) = abi.decode(key, (bytes, bytes));
        return
            RSA.pkcs1Sha256(abi.encodePacked(hash), signature, e, n)
                ? ITRC7913SignatureVerifier.verify.selector
                : bytes4(0xFFFFFFFF);
    }
}
