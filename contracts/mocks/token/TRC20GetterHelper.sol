// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ITRC20} from "../../token/TRC20/ITRC20.sol";
import {ITRC20Metadata} from "../../token/TRC20/extensions/ITRC20Metadata.sol";

contract TRC20GetterHelper {
    event TRC20TotalSupply(ITRC20 token, uint256 totalSupply);
    event TRC20BalanceOf(ITRC20 token, address account, uint256 balanceOf);
    event TRC20Allowance(ITRC20 token, address owner, address spender, uint256 allowance);
    event TRC20Name(ITRC20Metadata token, string name);
    event TRC20Symbol(ITRC20Metadata token, string symbol);
    event TRC20Decimals(ITRC20Metadata token, uint8 decimals);

    function totalSupply(ITRC20 token) external {
        emit TRC20TotalSupply(token, token.totalSupply());
    }

    function balanceOf(ITRC20 token, address account) external {
        emit TRC20BalanceOf(token, account, token.balanceOf(account));
    }

    function allowance(ITRC20 token, address owner, address spender) external {
        emit TRC20Allowance(token, owner, spender, token.allowance(owner, spender));
    }

    function name(ITRC20Metadata token) external {
        emit TRC20Name(token, token.name());
    }

    function symbol(ITRC20Metadata token) external {
        emit TRC20Symbol(token, token.symbol());
    }

    function decimals(ITRC20Metadata token) external {
        emit TRC20Decimals(token, token.decimals());
    }
}
