// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// External submodule `lib/erc4626-tests/` — a16z's ERC-4626 conformance suite.
// Its file and class names are upstream and must not be renamed even though
// we expose the implementation as `TRC4626` locally.
import {ERC4626Test} from "erc4626-tests/ERC4626.test.sol";

import {TRC20} from "@openzeppelin/contracts/token/TRC20/TRC20.sol";
import {TRC4626} from "@openzeppelin/contracts/token/TRC20/extensions/TRC4626.sol";

import {TRC20Mock} from "@openzeppelin/contracts/mocks/token/TRC20Mock.sol";
import {TRC4626Mock} from "@openzeppelin/contracts/mocks/token/TRC4626Mock.sol";
import {TRC4626OffsetMock} from "@openzeppelin/contracts/mocks/token/TRC4626OffsetMock.sol";

contract TRC4626VaultOffsetMock is TRC4626OffsetMock {
    constructor(
        TRC20 underlying_,
        uint8 offset_
    ) TRC20("My Token Vault", "MTKNV") TRC4626(underlying_) TRC4626OffsetMock(offset_) {}
}

contract TRC4626StdTest is ERC4626Test {
    TRC20 private _underlying = new TRC20Mock();

    function setUp() public override {
        _underlying_ = address(_underlying);
        _vault_ = address(new TRC4626Mock(_underlying_));
        _delta_ = 0;
        _vaultMayBeEmpty = true;
        _unlimitedAmount = true;
    }

    /**
     * @dev Check the case where calculated `decimals` value overflows the `uint8` type.
     */
    function testFuzzDecimalsOverflow(uint8 offset) public {
        /// @dev Remember that the `_underlying` exhibits a `decimals` value of 18.
        offset = uint8(bound(uint256(offset), 238, uint256(type(uint8).max)));
        TRC4626VaultOffsetMock trc4626VaultOffsetMock = new TRC4626VaultOffsetMock(_underlying, offset);
        vm.expectRevert();
        trc4626VaultOffsetMock.decimals();
    }
}
