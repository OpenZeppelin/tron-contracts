// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.4.0) (interfaces/ITRC1967.sol)

pragma solidity >=0.4.11;

/**
 * @dev TRC-1967: Proxy Storage Slots. This interface contains the events defined in https://github.com/tronprotocol/tips/blob/master/tip-1967.md[TIP-1967] (the TRON-side analogue of https://eips.ethereum.org/EIPS/eip-1967[EIP-1967]).
 */
interface ITRC1967 {
    /**
     * @dev Emitted when the implementation is upgraded.
     */
    event Upgraded(address indexed implementation);

    /**
     * @dev Emitted when the admin account has changed.
     */
    event AdminChanged(address previousAdmin, address newAdmin);

    /**
     * @dev Emitted when the beacon is changed.
     */
    event BeaconUpgraded(address indexed beacon);
}
