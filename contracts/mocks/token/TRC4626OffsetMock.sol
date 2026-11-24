// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC4626} from "../../token/TRC20/extensions/TRC4626.sol";

abstract contract TRC4626OffsetMock is TRC4626 {
    uint8 private immutable _offset;

    constructor(uint8 offset_) {
        _offset = offset_;
    }

    function _decimalsOffset() internal view virtual override returns (uint8) {
        return _offset;
    }
}
