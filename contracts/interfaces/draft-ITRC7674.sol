// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.4.0) (interfaces/draft-ITRC7674.sol)

pragma solidity >=0.6.2;

import {ITRC20} from "./ITRC20.sol";

/**
 * @dev Temporary Approval Extension for TRC-20 (https://github.com/ethereum/ERCs/pull/358[TRC-7674])
 */
interface ITRC7674 is ITRC20 {
    /**
     * @dev Set the temporary allowance, allowing `spender` to withdraw (within the same transaction) assets
     * held by the caller.
     */
    function temporaryApprove(address spender, uint256 value) external returns (bool success);
}
