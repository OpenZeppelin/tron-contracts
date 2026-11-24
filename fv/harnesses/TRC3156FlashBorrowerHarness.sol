// SPDX-License-Identifier: MIT

import {ITRC3156FlashBorrower} from "../patched/interfaces/ITRC3156FlashBorrower.sol";

pragma solidity ^0.8.20;

contract TRC3156FlashBorrowerHarness is ITRC3156FlashBorrower {
    bytes32 somethingToReturn;

    function onFlashLoan(address, address, uint256, uint256, bytes calldata) external view override returns (bytes32) {
        return somethingToReturn;
    }
}
