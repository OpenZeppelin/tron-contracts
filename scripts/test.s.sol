// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";

contract TestSCript is Script {
    function run() public {
        bytes32 TRC20_TEMPORARY_APPROVAL_STORAGE = keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.TRC20_TEMPORARY_APPROVAL_STORAGE")) - 1)) & ~bytes32(uint256(0xff));
        console.log("TRC20_TEMPORARY_APPROVAL_STORAGE");
        console.logBytes32(TRC20_TEMPORARY_APPROVAL_STORAGE);
    }
}