// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.7.0-rc.0) (interfaces/ITRC6372.sol)

pragma solidity >=0.4.16;

interface ITRC6372 {
    /**
     * @dev Clock used for flagging checkpoints. Can be overridden to implement timestamp based checkpoints (and voting).
     *
     * NOTE: Clock must not return 0.
     */
    function clock() external view returns (uint48);

    /**
     * @dev Description of the clock
     */
    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() external view returns (string memory);
}
