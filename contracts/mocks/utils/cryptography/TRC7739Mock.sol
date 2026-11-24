// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {TRC7739} from "../../../utils/cryptography/signers/draft-TRC7739.sol";
import {SignerECDSA} from "../../../utils/cryptography/signers/SignerECDSA.sol";
import {SignerP256} from "../../../utils/cryptography/signers/SignerP256.sol";
import {SignerRSA} from "../../../utils/cryptography/signers/SignerRSA.sol";

abstract contract TRC7739ECDSAMock is TRC7739, SignerECDSA {}
abstract contract TRC7739P256Mock is TRC7739, SignerP256 {}
abstract contract TRC7739RSAMock is TRC7739, SignerRSA {}
