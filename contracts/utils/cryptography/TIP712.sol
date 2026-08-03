// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.5.0) (utils/cryptography/TIP712.sol)

pragma solidity ^0.8.24;

import {MessageHashUtils} from "./MessageHashUtils.sol";
import {ShortStrings, ShortString} from "../ShortStrings.sol";
import {ITRC5267} from "../../interfaces/ITRC5267.sol";

/**
 * @dev https://github.com/tronprotocol/tips/blob/master/tip-712.md[TIP-712] is a standard for hashing and signing of
 * typed structured data, the TRON-side analogue of https://eips.ethereum.org/EIPS/eip-712[EIP-712].
 *
 * The encoding scheme specified in the standard requires a domain separator and a hash of the typed structured data,
 * whose encoding is very generic and therefore its implementation in Solidity is not feasible, thus this contract
 * does not implement the encoding itself. Protocols need to implement the type-specific encoding they need in order to
 * produce the hash of their typed data using a combination of `abi.encode` and `keccak256`.
 *
 * This contract implements the TIP-712 domain separator ({_domainSeparatorV4}) that is used as part of the encoding
 * scheme, and the final step of the encoding to obtain the message digest that is then signed via ECDSA
 * ({_hashTypedDataV4}).
 *
 * The implementation of the domain separator was designed to be as efficient as possible while still properly updating
 * the chain id to protect against replay attacks on an eventual fork of the chain.
 *
 * NOTE: TIP-712 differs from EIP-712 only in the domain separator's `chainId`, which uses `block.chainid & 0xffffffff`
 * (the low four bytes — the value TRON exposes through `eth_chainId` and that off-chain signers use). The encoding,
 * hashing and signing are otherwise identical to EIP-712, and the `EIP712Domain` type hash is unchanged. TIP-712's
 * other differences (stripping the `0x41` address prefix and the `trcToken` atomic type) concern off-chain encoders
 * and application-level struct fields, not this base contract.
 *
 * NOTE: This contract implements the version of the encoding known as "v4", as implemented by the JSON RPC method
 * https://docs.metamask.io/guide/signing-data.html[`eth_signTypedDataV4` in MetaMask].
 *
 * NOTE: In the upgradeable version of this contract, the cached values will correspond to the address, and the domain
 * separator of the implementation contract. This will cause the {_domainSeparatorV4} function to always rebuild the
 * separator from the immutable values, which is cheaper than accessing a cached version in cold storage.
 *
 * @custom:oz-upgrades-unsafe-allow state-variable-immutable
 */
abstract contract TIP712 is ITRC5267 {
    using ShortStrings for *;

    bytes32 private constant TYPE_HASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    // Cache the domain separator as an immutable value, but also store the chain id that it corresponds to, in order to
    // invalidate the cached domain separator if the chain id changes.
    bytes32 private immutable _cachedDomainSeparator;
    uint256 private immutable _cachedChainId;
    address private immutable _cachedThis;

    bytes32 private immutable _hashedName;
    bytes32 private immutable _hashedVersion;

    ShortString private immutable _name;
    ShortString private immutable _version;
    // slither-disable-next-line constable-states
    string private _nameFallback;
    // slither-disable-next-line constable-states
    string private _versionFallback;

    /**
     * @dev Initializes the domain separator and parameter caches.
     *
     * The meaning of `name` and `version` is specified in
     * https://eips.ethereum.org/EIPS/eip-712#definition-of-domainseparator[EIP-712]:
     *
     * - `name`: the user readable name of the signing domain, i.e. the name of the DApp or the protocol.
     * - `version`: the current major version of the signing domain.
     *
     * NOTE: These parameters cannot be changed except through a xref:learn::upgrading-smart-contracts.adoc[smart
     * contract upgrade].
     *
     * WARNING: This concerns the constructor-based variant of this contract. When `name` or `version` does not fit in
     * a `ShortString` (i.e. is 32 bytes or longer), the constructor writes it to the `_nameFallback`/`_versionFallback`
     * storage variables. Under a `delegatecall`-based deployment (minimal proxy/clone) that constructor never runs in
     * the proxy's storage context, so the fallbacks stay empty while {_domainSeparatorV4} still uses the
     * implementation's immutable `_hashedName`/`_hashedVersion`. As a result {eip712Domain} reports an empty
     * `name`/`version` that does not match the separator used for verification, breaking off-chain domain discovery.
     * Keep `name` and `version` within 31 bytes in that case. The upgradeable variant is not affected: it stores
     * `name` and `version` as plain strings in namespaced storage, written by its initializer and read back by both
     * {_domainSeparatorV4} and {eip712Domain}.
     */
    constructor(string memory name, string memory version) {
        _name = name.toShortStringWithFallback(_nameFallback);
        _version = version.toShortStringWithFallback(_versionFallback);
        _hashedName = keccak256(bytes(name));
        _hashedVersion = keccak256(bytes(version));

        _cachedChainId = block.chainid;
        _cachedDomainSeparator = _buildDomainSeparator();
        _cachedThis = address(this);
    }

    /**
     * @dev Returns the domain separator for the current chain.
     */
    function _domainSeparatorV4() internal view returns (bytes32) {
        if (address(this) == _cachedThis && block.chainid == _cachedChainId) {
            return _cachedDomainSeparator;
        } else {
            return _buildDomainSeparator();
        }
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        // TIP-712 defines the domain separator's `chainId` as `block.chainid & 0xffffffff` (the low four bytes),
        // matching the value off-chain TRON signers and `eth_chainId` use. This is a no-op on networks where the
        // CHAINID opcode already returns four bytes.
        return keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, block.chainid & 0xffffffff, address(this)));
    }

    /**
     * @dev Given an already https://eips.ethereum.org/EIPS/eip-712#definition-of-hashstruct[hashed struct], this
     * function returns the hash of the fully encoded TIP712 message for this domain.
     *
     * This hash can be used together with {ECDSA-recover} to obtain the signer of a message. For example:
     *
     * ```solidity
     * bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
     *     keccak256("Mail(address to,string contents)"),
     *     mailTo,
     *     keccak256(bytes(mailContents))
     * )));
     * address signer = ECDSA.recover(digest, signature);
     * ```
     */
    function _hashTypedDataV4(bytes32 structHash) internal view virtual returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(_domainSeparatorV4(), structHash);
    }

    /// @inheritdoc ITRC5267
    function eip712Domain()
        public
        view
        virtual
        returns (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        )
    {
        return (
            hex"0f", // 01111
            _TIP712Name(),
            _TIP712Version(),
            block.chainid & 0xffffffff,
            address(this),
            bytes32(0),
            new uint256[](0)
        );
    }

    /**
     * @dev The name parameter for the TIP712 domain.
     *
     * NOTE: By default this function reads _name which is an immutable value.
     * It only reads from storage if necessary (in case the value is too large to fit in a ShortString).
     */
    // solhint-disable-next-line func-name-mixedcase
    function _TIP712Name() internal view returns (string memory) {
        return _name.toStringWithFallback(_nameFallback);
    }

    /**
     * @dev The version parameter for the TIP712 domain.
     *
     * NOTE: By default this function reads _version which is an immutable value.
     * It only reads from storage if necessary (in case the value is too large to fit in a ShortString).
     */
    // solhint-disable-next-line func-name-mixedcase
    function _TIP712Version() internal view returns (string memory) {
        return _version.toStringWithFallback(_versionFallback);
    }
}
