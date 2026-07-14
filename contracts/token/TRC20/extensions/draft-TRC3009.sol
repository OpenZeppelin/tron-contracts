// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TRC20} from "../TRC20.sol";
import {TIP712} from "../../../utils/cryptography/TIP712.sol";
import {ECDSA} from "../../../utils/cryptography/ECDSA.sol";
import {ITRC3009, ITRC3009Cancel} from "../../../interfaces/draft-ITRC3009.sol";
import {Time} from "../../../utils/types/Time.sol";

/**
 * @dev Implementation of the ERC-3009 Transfer With Authorization extension allowing
 * transfers to be made via signatures, as defined in https://eips.ethereum.org/EIPS/eip-3009[ERC-3009]
 * (TRON-namespaced as TRC-3009).
 *
 * Adds the {transferWithAuthorization} and {receiveWithAuthorization} methods, which
 * can be used to change an account's TRC-20 balance by presenting a message signed
 * by the account. By not relying on {ITRC20-approve} and {ITRC20-transferFrom}, the
 * token holder account doesn't need to send a transaction, and thus is not required
 * to hold TRX at all.
 *
 * NOTE: To enable both timestamp-based and block-number-based validity windows, `validAfter` and
 * `validBefore` use a dual-clock encoding mirroring ERC-4337's validation-data time ranges. Bit 47
 * ({BLOCK_RANGE_FLAG}) acts as a clock selector: when *both* `validAfter` and `validBefore` have this bit
 * set, the values are interpreted as block numbers; otherwise they are interpreted as Unix timestamps (the
 * default, matching the ERC-3009 specification). Since the current clock fits in 48 bits, any bit set at
 * position 47 or above (other than the active clock-mode flag) makes the value point to an unreachable
 * future. See {_checkValidity}.
 */
abstract contract TRC3009 is TRC20, TIP712, ITRC3009, ITRC3009Cancel {
    /// @dev The signature is invalid
    error TRC3009InvalidSignature();

    /// @dev The authorization is not valid at the given time
    error TRC3009InvalidAuthorizationTime(uint256 validAfter, uint256 validBefore);

    /// @dev The authorization has already been used or canceled
    error TRC3009UsedAuthorization(address authorizer, bytes32 nonce);

    bytes32 internal constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );
    bytes32 internal constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );
    bytes32 internal constant CANCEL_AUTHORIZATION_TYPEHASH =
        keccak256("CancelAuthorization(address authorizer,bytes32 nonce)");

    /**
     * @dev Flag (bit 47) selecting the block-number clock in the dual-clock encoding of `validAfter` and
     * `validBefore`. Matches ERC-4337's `BLOCK_RANGE_FLAG` (this repository does not include the
     * account-abstraction utilities, so the constant is defined here).
     */
    uint256 internal constant BLOCK_RANGE_FLAG = 1 << 47;

    mapping(address account => mapping(bytes32 nonce => bool used)) private _usedNonces;

    /// @inheritdoc ITRC3009
    function authorizationState(address authorizer, bytes32 nonce) public view virtual returns (bool) {
        return _usedNonces[authorizer][nonce];
    }

    /// @inheritdoc ITRC3009
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        bytes32 hash = _hashTypedDataV4(
            keccak256(abi.encode(TRANSFER_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce))
        );
        require(from == ECDSA.recover(hash, v, r, s), TRC3009InvalidSignature());
        _transferWithAuthorization(from, to, value, validAfter, validBefore, nonce);
    }

    /// @inheritdoc ITRC3009
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        bytes32 hash = _hashTypedDataV4(
            keccak256(abi.encode(RECEIVE_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce))
        );
        require(from == ECDSA.recover(hash, v, r, s), TRC3009InvalidSignature());
        require(to == _msgSender(), TRC20InvalidReceiver(to));
        _transferWithAuthorization(from, to, value, validAfter, validBefore, nonce);
    }

    /// @inheritdoc ITRC3009Cancel
    function cancelAuthorization(address authorizer, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) public virtual {
        bytes32 hash = _hashTypedDataV4(keccak256(abi.encode(CANCEL_AUTHORIZATION_TYPEHASH, authorizer, nonce)));
        require(authorizer == ECDSA.recover(hash, v, r, s), TRC3009InvalidSignature());
        _cancelAuthorization(authorizer, nonce);
    }

    /// @dev Performs the time and nonce checks, then executes the transfer.
    function _transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) internal virtual {
        _checkValidity(validAfter, validBefore);
        _consumeNonce(from, nonce);
        emit AuthorizationUsed(from, nonce);
        _transfer(from, to, value);
    }

    /// @dev Consumes the nonce and emits the cancellation event.
    function _cancelAuthorization(address authorizer, bytes32 nonce) internal virtual {
        _consumeNonce(authorizer, nonce);
        emit AuthorizationCanceled(authorizer, nonce);
    }

    /// @dev Marks `nonce` as used for `authorizer`. Reverts with {TRC3009UsedAuthorization} if already consumed.
    function _consumeNonce(address authorizer, bytes32 nonce) internal virtual {
        require(!_usedNonces[authorizer][nonce], TRC3009UsedAuthorization(authorizer, nonce));
        _usedNonces[authorizer][nonce] = true;
    }

    /**
     * @dev Checks the validity of the authorization against the current clock.
     *
     * Following the ERC-4337-style dual-clock encoding, the clock is interpreted as block number only when
     * *both* `validAfter` and `validBefore` carry the {BLOCK_RANGE_FLAG}; otherwise it falls back to
     * timestamp (matching the ERC-3009 specification's default). Mixed-flag inputs therefore fall back to
     * the timestamp clock rather than reverting, mirroring ERC-4337's `parseValidationData`. The flag bit
     * is masked off the values only when block-mode is engaged; in timestamp mode the full 256-bit value
     * participates in the comparison.
     *
     * NOTE: Any `validAfter` or `validBefore` with a bit set at position 47 or above (other than the active
     * clock-mode flag) is interpreted as an unreachable point in the future (i.e. never valid after or
     * always valid before, respectively).
     */
    function _checkValidity(uint256 validAfter, uint256 validBefore) internal view virtual {
        uint256 flag = validAfter & validBefore & BLOCK_RANGE_FLAG;
        uint256 current = flag == 0 ? Time.timestamp() : Time.blockNumber();
        require(
            current > (validAfter & ~flag) && current < (validBefore & ~flag),
            TRC3009InvalidAuthorizationTime(validAfter, validBefore)
        );
    }
}
