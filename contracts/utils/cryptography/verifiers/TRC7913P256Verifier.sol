// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (utils/cryptography/verifiers/TRC7913P256Verifier.sol)

pragma solidity ^0.8.20;

import {P256} from "../P256.sol";
import {ITRC7913SignatureVerifier} from "../../../interfaces/ITRC7913.sol";

/**
 * @dev TRC-7913 signature verifier that support P256 (secp256r1) keys.
 *
 * @custom:stateless
 */
contract TRC7913P256Verifier is ITRC7913SignatureVerifier {
    /// @inheritdoc ITRC7913SignatureVerifier
    function verify(bytes calldata key, bytes32 hash, bytes calldata signature) public view virtual returns (bytes4) {
        // A P256 signature is `r || s` (0x40 bytes). A trailing recovery byte (a 0x41-byte signature) is
        // tolerated and ignored, matching OZ TRC-7913 and {SignerP256}: only the first 0x40 bytes are read,
        // and signature malleability is already prevented by {P256-verify}'s low-s check, so trailing bytes
        // cannot change the verification result.
        if (key.length == 0x40 && signature.length >= 0x40) {
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
