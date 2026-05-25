// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TRC20} from "../../../token/TRC20/TRC20.sol";
import {TRC20Permit} from "../../../token/TRC20/extensions/TRC20Permit.sol";
import {TRC20Votes} from "../../../token/TRC20/extensions/TRC20Votes.sol";
import {Nonces} from "../../../utils/Nonces.sol";

contract MyTokenTimestampBased is TRC20, TRC20Permit, TRC20Votes {
    constructor() TRC20("MyTokenTimestampBased", "MTK") TRC20Permit("MyTokenTimestampBased") {}

    // Overrides IERC6372 functions to make the token & governor timestamp-based

    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    // The functions below are overrides required by Solidity.

    function _update(address from, address to, uint256 amount) internal override(TRC20, TRC20Votes) {
        super._update(from, to, amount);
    }

    function nonces(address owner) public view virtual override(TRC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
