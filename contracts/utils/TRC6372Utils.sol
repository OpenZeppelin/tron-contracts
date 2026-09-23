// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.7.0-rc.0) (utils/TRC6372Utils.sol)

pragma solidity ^0.8.24;

import {ITRC6372} from "../interfaces/ITRC6372.sol";
import {Time} from "./types/Time.sol";

/**
 * @dev Utility library for the TRC-6372 clock standard.
 */
library TRC6372Utils {
    /// @dev The clock was incorrectly modified.
    error TRC6372InconsistentClock();

    /// @dev Variant of {blockNumberClockMode-uint48-} that checks against an ITRC6372 instance
    function blockNumberClockMode(ITRC6372 instance) internal view returns (string memory) {
        return blockNumberClockMode(instance.clock());
    }

    /// @dev Variant of {blockNumberClockMode-uint48-} that checks against the clock function.
    function blockNumberClockMode(function() view returns (uint48) clock) internal view returns (string memory) {
        return blockNumberClockMode(clock());
    }

    /// @dev Block number clock mode. Checks that the current `clock` was not modified.
    function blockNumberClockMode(uint48 clock) internal view returns (string memory) {
        // Check that the clock was not modified
        if (clock != Time.blockNumber()) {
            revert TRC6372InconsistentClock();
        }
        return "mode=blocknumber&from=default";
    }

    /// @dev Variant of {timestampClockMode-uint48-} that checks against an ITRC6372 instance
    function timestampClockMode(ITRC6372 instance) internal view returns (string memory) {
        return timestampClockMode(instance.clock());
    }

    /// @dev Variant of {timestampClockMode-uint48-} that checks against the clock function.
    function timestampClockMode(function() view returns (uint48) clock) internal view returns (string memory) {
        return timestampClockMode(clock());
    }

    /// @dev Timestamp clock mode. Checks that the current `clock` was not modified.
    function timestampClockMode(uint48 clock) internal view returns (string memory) {
        // Check that the clock was not modified
        if (clock != Time.timestamp()) {
            revert TRC6372InconsistentClock();
        }
        return "mode=timestamp";
    }
}
