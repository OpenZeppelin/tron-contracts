// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "../patched/token/TRC20/TRC20.sol";
import "../patched/token/TRC20/extensions/TRC20Permit.sol";
import "../patched/token/TRC20/extensions/TRC20FlashMint.sol";

contract TRC20FlashMintHarness is TRC20, TRC20Permit, TRC20FlashMint {
    uint256 someFee;
    address someFeeReceiver;

    constructor(string memory name, string memory symbol) TRC20(name, symbol) TRC20Permit(name) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }

    // public accessor
    function flashFeeReceiver() public view returns (address) {
        return someFeeReceiver;
    }

    // internal hook
    function _flashFee(address, uint256) internal view override returns (uint256) {
        return someFee;
    }

    function _flashFeeReceiver() internal view override returns (address) {
        return someFeeReceiver;
    }
}
