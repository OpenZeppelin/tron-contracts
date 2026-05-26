// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {TRC721Votes} from "../../token/TRC721/extensions/TRC721Votes.sol";
import {TRC20Votes} from "../../token/TRC20/extensions/TRC20Votes.sol";
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

abstract contract TRC721VotesTimestampMock is TRC721Votes {
    function clock() public view virtual override returns (uint48) {
        return SafeCast.toUint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public view virtual override returns (string memory) {
        return "mode=timestamp";
    }
}
