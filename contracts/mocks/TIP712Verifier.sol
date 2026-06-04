// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {ECDSA} from "../utils/cryptography/ECDSA.sol";
import {TIP712} from "../utils/cryptography/TIP712.sol";

abstract contract TIP712Verifier is TIP712 {
    function verify(bytes memory signature, address signer, address mailTo, string memory mailContents) external view {
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(keccak256("Mail(address to,string contents)"), mailTo, keccak256(bytes(mailContents))))
        );
        address recoveredSigner = ECDSA.recover(digest, signature);
        require(recoveredSigner == signer);
    }
}
