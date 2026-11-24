// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20Permit} from "../patched/token/TRC20/extensions/TRC20Permit.sol";
import {TRC20Wrapper, ITRC20, TRC20} from "../patched/token/TRC20/extensions/TRC20Wrapper.sol";

contract TRC20WrapperHarness is TRC20Permit, TRC20Wrapper {
    constructor(
        ITRC20 _underlying,
        string memory _name,
        string memory _symbol
    ) TRC20(_name, _symbol) TRC20Permit(_name) TRC20Wrapper(_underlying) {}

    function recover(address account) public returns (uint256) {
        return _recover(account);
    }

    function decimals() public view override(TRC20Wrapper, TRC20) returns (uint8) {
        return super.decimals();
    }
}
