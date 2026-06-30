// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "../patched/interfaces/ITRC721Receiver.sol";

contract TRC721ReceiverHarness is ITRC721Receiver {
    function onTRC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onTRC721Received.selector;
    }
}
