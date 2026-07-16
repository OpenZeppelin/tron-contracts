// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.4.0) (interfaces/ITRC5805.sol)

pragma solidity >=0.8.4;

import {IVotes} from "../governance/utils/IVotes.sol";
import {ITRC6372} from "./ITRC6372.sol";

interface ITRC5805 is ITRC6372, IVotes {}
