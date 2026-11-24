// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import {UUPSUpgradeable} from "../../proxy/utils/UUPSUpgradeable.sol";
import {TRC1967Utils} from "../../proxy/TRC1967/TRC1967Utils.sol";

contract NonUpgradeableMock {
    uint256 internal _counter;

    function current() external view returns (uint256) {
        return _counter;
    }

    function increment() external {
        ++_counter;
    }
}

contract UUPSUpgradeableMock is NonUpgradeableMock, UUPSUpgradeable {
    // Not having any checks in this function is dangerous! Do not do this outside tests!
    function _authorizeUpgrade(address) internal override {}
}

contract UUPSUpgradeableUnsafeMock is UUPSUpgradeableMock {
    function upgradeToAndCall(address newImplementation, bytes memory data) public payable override {
        TRC1967Utils.upgradeToAndCall(newImplementation, data);
    }
}

contract UUPSUnsupportedProxiableUUIDMock is NonUpgradeableMock {
    function proxiableUUID() external pure returns (bytes32) {
        return keccak256("invalid UUID");
    }
}
