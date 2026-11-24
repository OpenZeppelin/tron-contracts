// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";

/**
 * @dev Mock that mimics TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) with its transfer fee enabled.
 *
 * Like {TRC20USDTMock}, `transfer` performs the transfer (reverting on failure) but returns `false` on success.
 * Additionally, it reproduces Tether's fee model: the sender is debited the full `value`, the recipient is
 * credited `value - fee`, and `fee` is routed to a collector. This lets us exercise the case where USDT's fee
 * is switched on, which makes a recipient-balance-delta check reject an otherwise-successful transfer.
 */
abstract contract TRC20USDTFeeMock is TRC20 {
    uint256 private _feeBasisPoints;
    address private _feeCollector;

    /// @dev Configure the transfer fee (in basis points) and the collector that receives it.
    function setFee(uint256 feeBasisPoints, address feeCollector) public {
        _feeBasisPoints = feeBasisPoints;
        _feeCollector = feeCollector;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        address owner = _msgSender();
        uint256 fee = (value * _feeBasisPoints) / 10_000;
        // Debit the sender the full `value` (split between recipient and collector), matching TRON USDT.
        _transfer(owner, to, value - fee);
        if (fee > 0) {
            _transfer(owner, _feeCollector, fee);
        }
        return false;
    }
}
