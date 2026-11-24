// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC1363} from "../../token/TRC20/extensions/TRC1363.sol";

abstract contract TRC1363NoReturnMock is TRC1363 {
    function transferAndCall(address to, uint256 value, bytes memory data) public override returns (bool) {
        super.transferAndCall(to, value, data);
        assembly {
            return(0, 0)
        }
    }

    function transferFromAndCall(
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) public override returns (bool) {
        super.transferFromAndCall(from, to, value, data);
        assembly {
            return(0, 0)
        }
    }

    function approveAndCall(address spender, uint256 value, bytes memory data) public override returns (bool) {
        super.approveAndCall(spender, value, data);
        assembly {
            return(0, 0)
        }
    }
}
