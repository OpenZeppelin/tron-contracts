// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (token/TRC20/extensions/TRC20Permit.sol)

pragma solidity ^0.8.24;

import {ITRC20Permit} from "./ITRC20Permit.sol";
import {TRC20} from "../TRC20.sol";
import {ECDSA} from "../../../utils/cryptography/ECDSA.sol";
import {TIP712} from "../../../utils/cryptography/TIP712.sol";
import {Nonces} from "../../../utils/Nonces.sol";

/**
 * @dev Implementation of the TRC-20 Permit extension allowing approvals to be made via signatures, as defined in
 * https://github.com/tronprotocol/tips/blob/master/tip-2612.md[TIP-2612] (the TRON-side analogue
 * of https://eips.ethereum.org/EIPS/eip-2612[EIP-2612]).
 *
 * Adds the {permit} method, which can be used to change an account's TRC-20 allowance (see {ITRC20-allowance}) by
 * presenting a message signed by the account. By not relying on `{ITRC20-approve}`, the token holder account doesn't
 * need to send a transaction, and thus is not required to hold Ether at all.
 */
abstract contract TRC20Permit is TRC20, ITRC20Permit, TIP712, Nonces {
    bytes32 private constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    /**
     * @dev Permit deadline has expired.
     */
    error TRC2612ExpiredSignature(uint256 deadline);

    /**
     * @dev Mismatched signature.
     */
    error TRC2612InvalidSigner(address signer, address owner);

    /**
     * @dev Initializes the {TIP712} domain separator using the `name` parameter, and setting `version` to `"1"`.
     *
     * It's a good idea to use the same `name` that is defined as the TRC-20 token name.
     */
    constructor(string memory name) TIP712(name, "1") {}

    /// @inheritdoc ITRC20Permit
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        if (block.timestamp > deadline) {
            revert TRC2612ExpiredSignature(deadline);
        }

        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, _useNonce(owner), deadline));

        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(hash, v, r, s);
        if (signer != owner) {
            revert TRC2612InvalidSigner(signer, owner);
        }

        _approve(owner, spender, value);
    }

    /// @inheritdoc ITRC20Permit
    function nonces(address owner) public view virtual override(ITRC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }

    /// @inheritdoc ITRC20Permit
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
