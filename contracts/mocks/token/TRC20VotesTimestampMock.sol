// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {TRC20Votes} from "../../token/TRC20/extensions/TRC20Votes.sol";
import {ERC721Votes} from "../../token/ERC721/extensions/ERC721Votes.sol";
import {SafeCast} from "../../utils/math/SafeCast.sol";

abstract contract TRC20VotesTimestampMock is TRC20Votes {
    function clock() public view virtual override returns (uint48) {
        return SafeCast.toUint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public view virtual override returns (string memory) {
        return "mode=timestamp";
    }
}

abstract contract ERC721VotesTimestampMock is ERC721Votes {
    function clock() public view virtual override returns (uint48) {
        return SafeCast.toUint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public view virtual override returns (string memory) {
        return "mode=timestamp";
    }
}
