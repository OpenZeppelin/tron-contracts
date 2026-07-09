// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ITRC3156FlashBorrower} from "../interfaces/ITRC3156.sol";

/**
 * @dev Minimal {ITRC3156FlashBorrower} whose {onFlashLoan} returns a value fixed at construction.
 *
 * Used to assert TIP-3156 conformance of {TRC20FlashMint}: the lender must accept the keccak256 hash
 * of "TRC3156FlashBorrower.onFlashLoan" and reject any other value, including the legacy Ethereum
 * "ERC3156FlashBorrower.onFlashLoan" preimage. The lender checks the return value before pulling the
 * repayment allowance, so this mock does not need to approve anything.
 *
 * WARNING: this mock is for testing purposes ONLY and is not a secure flash-borrower implementation.
 */
contract TRC3156FlashBorrowerReturnValueMock is ITRC3156FlashBorrower {
    bytes32 private immutable _returnValue;

    constructor(bytes32 returnValue) {
        _returnValue = returnValue;
    }

    function onFlashLoan(
        address /*initiator*/,
        address /*token*/,
        uint256 /*amount*/,
        uint256 /*fee*/,
        bytes calldata /*data*/
    ) external view returns (bytes32) {
        return _returnValue;
    }
}
