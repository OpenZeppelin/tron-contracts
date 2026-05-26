// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";

abstract contract TRC20NoReturnMock is TRC20 {
    function transfer(address to, uint256 amount) public override returns (bool) {
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        super.transfer(to, amount);
        assembly {
            return(0, 0)
        }
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        super.transferFrom(from, to, amount);
        assembly {
            return(0, 0)
        }
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        super.approve(spender, amount);
        assembly {
            return(0, 0)
        }
    }
}
