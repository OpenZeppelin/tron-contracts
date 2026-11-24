// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import {TRC1967Proxy} from "../../proxy/TRC1967/TRC1967Proxy.sol";

contract TRC1967ProxyUnsafe is TRC1967Proxy {
    constructor(address implementation, bytes memory _data) payable TRC1967Proxy(implementation, _data) {}

    function _unsafeAllowUninitialized() internal pure override returns (bool) {
        return true;
    }
}
