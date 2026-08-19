// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.4.0) (interfaces/ITRC1271.sol)

pragma solidity >=0.5.0;

/**
 * @dev Interface of the TRC-1271 standard signature validation method for
 * contracts, as defined in https://github.com/tronprotocol/tips/blob/master/tip-1271.md[TIP-1271]
 * (the TRON-side analogue of https://eips.ethereum.org/EIPS/eip-1271[EIP-1271]).
 */
interface ITRC1271 {
    /**
     * @dev Should return whether the signature provided is valid for the provided data
     * @param hash      Hash of the data to be signed
     * @param signature Signature byte array associated with `hash`
     */
    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4 magicValue);
}
