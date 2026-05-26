// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";
import {Multicall} from "../../utils/Multicall.sol";

abstract contract TRC20MulticallMock is TRC20, Multicall {}
