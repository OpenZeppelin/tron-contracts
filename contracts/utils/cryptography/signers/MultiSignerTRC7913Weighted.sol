// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.4.0) (utils/cryptography/signers/MultiSignerTRC7913Weighted.sol)

pragma solidity ^0.8.26;

import {SafeCast} from "../../math/SafeCast.sol";
import {MultiSignerTRC7913} from "./MultiSignerTRC7913.sol";

/**
 * @dev Extension of {MultiSignerTRC7913} that supports weighted signatures.
 *
 * This contract allows assigning different weights to each signer, enabling more
 * flexible governance schemes. For example, some signers could have higher weight
 * than others, allowing for weighted voting or prioritized authorization.
 *
 * Example of usage:
 *
 * ```solidity
 * contract MyWeightedMultiSignerAccount is Account, MultiSignerTRC7913Weighted, Initializable {
 *     function initialize(bytes[] memory signers, uint64[] memory weights, uint64 threshold) public initializer {
 *         _addSigners(signers);
 *         _setSignerWeights(signers, weights);
 *         _setThreshold(threshold);
 *     }
 *
 *     function addSigners(bytes[] memory signers) public onlyEntryPointOrSelf {
 *         _addSigners(signers);
 *     }
 *
 *     function removeSigners(bytes[] memory signers) public onlyEntryPointOrSelf {
 *         _removeSigners(signers);
 *     }
 *
 *     function setThreshold(uint64 threshold) public onlyEntryPointOrSelf {
 *         _setThreshold(threshold);
 *     }
 *
 *     function setSignerWeights(bytes[] memory signers, uint64[] memory weights) public onlyEntryPointOrSelf {
 *         _setSignerWeights(signers, weights);
 *     }
 * }
 * ```
 *
 * IMPORTANT: When setting a threshold value, ensure it matches the scale used for signer weights.
 * For example, if signers have weights like 1, 2, or 3, then a threshold of 4 would require at
 * least two signers (e.g., one with weight 1 and one with weight 3). See {signerWeight}.
 */
abstract contract MultiSignerTRC7913Weighted is MultiSignerTRC7913 {
    using SafeCast for *;

    // Sum of all the extra weights of all signers. Packed with `MultiSignerTRC7913._threshold` in the
    // constructor-based variant; the upgradeable variant holds the two in separate namespaces.
    uint64 private _totalExtraWeight;

    // Mapping from signer to extraWeight (in addition to all authorized signers having weight 1)
    mapping(bytes signer => uint64) private _extraWeights;

    /**
     * @dev Emitted when a signer's weight is changed.
     *
     * NOTE: Not emitted in {_addSigners} or {_removeSigners}. Indexers must rely on {TRC7913SignerAdded}
     * and {TRC7913SignerRemoved} to index a default weight of 1. See {signerWeight}.
     */
    event TRC7913SignerWeightChanged(bytes indexed signer, uint64 weight);

    /// @dev Thrown when a signer's weight is invalid.
    error MultiSignerTRC7913WeightedInvalidWeight(bytes signer, uint64 weight);

    /// @dev Thrown when the arrays lengths don't match. See {_setSignerWeights}.
    error MultiSignerTRC7913WeightedMismatchedLength();

    constructor(bytes[] memory signers_, uint64[] memory weights_, uint64 threshold_) MultiSignerTRC7913(signers_, 1) {
        _setSignerWeights(signers_, weights_);
        _setThreshold(threshold_);
    }

    /// @dev Gets the weight of a signer. Returns 0 if the signer is not authorized.
    function signerWeight(bytes memory signer) public view virtual returns (uint64) {
        unchecked {
            // Safe cast, _setSignerWeights guarantees 1+_extraWeights is a uint64
            return uint64(isSigner(signer).toUint() * (1 + _extraWeights[signer]));
        }
    }

    /// @dev Gets the total weight of all signers.
    function totalWeight() public view virtual returns (uint64) {
        return (getSignerCount() + _totalExtraWeight).toUint64();
    }

    /**
     * @dev Sets weights for multiple signers at once. Internal version without access control.
     *
     * Requirements:
     *
     * * `signers` and `weights` arrays must have the same length. Reverts with {MultiSignerTRC7913WeightedMismatchedLength} on mismatch.
     * * Each signer must exist in the set of authorized signers. Otherwise reverts with {MultiSignerTRC7913NonexistentSigner}
     * * Each weight must be greater than 0. Otherwise reverts with {MultiSignerTRC7913WeightedInvalidWeight}
     * * See {_validateReachableThreshold} for the threshold validation.
     *
     * Emits {TRC7913SignerWeightChanged} for each signer.
     */
    function _setSignerWeights(bytes[] memory signers, uint64[] memory weights) internal virtual {
        require(signers.length == weights.length, MultiSignerTRC7913WeightedMismatchedLength());

        uint256 extraWeightAdded = 0;
        uint256 extraWeightRemoved = 0;
        for (uint256 i = 0; i < signers.length; ++i) {
            bytes memory signer = signers[i];
            require(isSigner(signer), MultiSignerTRC7913NonexistentSigner(signer));

            uint64 weight = weights[i];
            require(weight > 0, MultiSignerTRC7913WeightedInvalidWeight(signer, weight));

            unchecked {
                uint64 oldExtraWeight = _extraWeights[signer];
                uint64 newExtraWeight = weight - 1;

                if (oldExtraWeight != newExtraWeight) {
                    // Overflow impossible: weight values are bounded by uint64 and economic constraints
                    extraWeightRemoved += oldExtraWeight;
                    extraWeightAdded += _extraWeights[signer] = newExtraWeight;
                    emit TRC7913SignerWeightChanged(signer, weight);
                }
            }
        }
        unchecked {
            // Safe from underflow: `extraWeightRemoved` is bounded by `_totalExtraWeight` by construction
            // and weight values are bounded by uint64 and economic constraints
            _totalExtraWeight = (uint256(_totalExtraWeight) + extraWeightAdded - extraWeightRemoved).toUint64();
        }
        _validateReachableThreshold();
    }

    /**
     * @dev See {MultiSignerTRC7913-_addSigners}.
     *
     * In cases where {totalWeight} is almost `type(uint64).max` (due to a large `_totalExtraWeight`), adding new
     * signers could cause the {totalWeight} computation to overflow. Adding a {totalWeight} calls after the new
     * signers are added ensures no such overflow happens.
     */
    function _addSigners(bytes[] memory newSigners) internal virtual override {
        super._addSigners(newSigners);

        // This will revert if the new signers cause an overflow
        _validateReachableThreshold();
    }

    /**
     * @dev See {MultiSignerTRC7913-_removeSigners}.
     *
     * Just like {_addSigners}, this function does not emit {TRC7913SignerWeightChanged} events. The
     * {TRC7913SignerRemoved} event emitted by {MultiSignerTRC7913-_removeSigners} is enough to track weights here.
     */
    function _removeSigners(bytes[] memory signers) internal virtual override {
        // Clean up weights for removed signers
        //
        // The `extraWeightRemoved` is bounded by `_totalExtraWeight`. The `super._removeSigners` function will revert
        // if the signers array contains any duplicates, ensuring each signer's weight is only counted once. Since
        // `_totalExtraWeight` is stored as a `uint64`, the final subtraction operation is also safe.
        unchecked {
            uint64 extraWeightRemoved = 0;
            for (uint256 i = 0; i < signers.length; ++i) {
                bytes memory signer = signers[i];

                extraWeightRemoved += _extraWeights[signer];
                delete _extraWeights[signer];
            }
            _totalExtraWeight -= extraWeightRemoved;
        }
        super._removeSigners(signers);
    }

    /**
     * @dev Sets the threshold for the multisignature operation. Internal version without access control.
     *
     * Requirements:
     *
     * * The {totalWeight} must be `>=` the {threshold}. Otherwise reverts with {MultiSignerTRC7913UnreachableThreshold}
     *
     * NOTE: This function intentionally does not call `super._validateReachableThreshold` because the base implementation
     * assumes each signer has a weight of 1, which is a subset of this weighted implementation. Consider that multiple
     * implementations of this function may exist in the contract, so important side effects may be missed
     * depending on the linearization order.
     */
    function _validateReachableThreshold() internal view virtual override {
        uint64 weight = totalWeight();
        uint64 currentThreshold = threshold();
        require(weight >= currentThreshold, MultiSignerTRC7913UnreachableThreshold(weight, currentThreshold));
    }

    /**
     * @dev Validates that the total weight of signers meets the threshold requirement.
     *
     * NOTE: This function intentionally does not call `super._validateThreshold` because the base implementation
     * assumes each signer has a weight of 1, which is a subset of this weighted implementation. Consider that multiple
     * implementations of this function may exist in the contract, so important side effects may be missed
     * depending on the linearization order.
     */
    function _validateThreshold(bytes[] memory signers) internal view virtual override returns (bool) {
        unchecked {
            uint64 weight = 0;
            for (uint256 i = 0; i < signers.length; ++i) {
                // Overflow impossible: weight values are bounded by uint64 and economic constraints
                weight += signerWeight(signers[i]);
            }
            return weight >= threshold();
        }
    }
}
