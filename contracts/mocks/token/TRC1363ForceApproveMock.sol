// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC1363} from "../../token/TRC20/extensions/TRC1363.sol";

// contract that replicate USDT approval behavior in approveAndCall
abstract contract TRC1363ForceApproveMock is TRC1363 {
    function approveAndCall(address spender, uint256 amount, bytes memory data) public virtual override returns (bool) {
        require(amount == 0 || allowance(msg.sender, spender) == 0, "USDT approval failure");
        return super.approveAndCall(spender, amount, data);
    }
}
