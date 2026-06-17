// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (utils/cryptography/verifiers/TRC7913P256Verifier.sol)

pragma solidity ^0.8.20;

import {P256} from "../P256.sol";
import {ITRC7913SignatureVerifier} from "../../../interfaces/ITRC7913.sol";

/**
 * @dev ERC-7913 signature verifier that support P256 (secp256r1) keys.
 *
 * @custom:stateless
 */
contract TRC7913P256Verifier is ITRC7913SignatureVerifier {
    /// @inheritdoc ITRC7913SignatureVerifier
    function verify(bytes calldata key, bytes32 hash, bytes calldata signature) public view virtual returns (bytes4) {
        // A P256 signature is exactly `r || s` (0x40 bytes). Require the canonical length so that
        // trailing bytes cannot produce multiple distinct encodings that verify identically.
        if (key.length == 0x40 && signature.length == 0x40) {
            bytes32 qx = bytes32(key[0x00:0x20]);
            bytes32 qy = bytes32(key[0x20:0x40]);
            bytes32 r = bytes32(signature[0x00:0x20]);
            bytes32 s = bytes32(signature[0x20:0x40]);
            if (P256.verify(hash, r, s, qx, qy)) {
                return ITRC7913SignatureVerifier.verify.selector;
            }
        }
        return 0xFFFFFFFF;
    }
}
