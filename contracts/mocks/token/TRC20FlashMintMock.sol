// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20FlashMint} from "../../token/TRC20/extensions/TRC20FlashMint.sol";

abstract contract TRC20FlashMintMock is TRC20FlashMint {
    uint256 _flashFeeAmount;
    address _flashFeeReceiverAddress;

    function setFlashFee(uint256 amount) public {
        _flashFeeAmount = amount;
    }

    function _flashFee(address, uint256) internal view override returns (uint256) {
        return _flashFeeAmount;
    }

    function setFlashFeeReceiver(address receiver) public {
        _flashFeeReceiverAddress = receiver;
    }

    function _flashFeeReceiver() internal view override returns (address) {
        return _flashFeeReceiverAddress;
    }
}
