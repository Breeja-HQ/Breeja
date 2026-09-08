// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DestPool} from "../DestPool.sol";
import {IHederaTokenService} from "../interfaces/IHederaTokenService.sol";

/// See HederaSourceVault for why this exists. DestPool holds pool liquidity
/// across payments, so its association is a one-time owner-gated setup call
/// made once right after deploy, before any USDC can be sent to it.
contract HederaDestPool is DestPool {
    address private constant HTS_PRECOMPILE = 0x0000000000000000000000000000000000000167;

    error AssociationFailed(int64 responseCode);

    constructor(address token_, address relayer_, address owner_, uint256 feeBps_)
        DestPool(token_, relayer_, owner_, feeBps_)
    {}

    function associateToken() external onlyOwner {
        int64 responseCode = IHederaTokenService(HTS_PRECOMPILE).associateToken(address(this), address(token));
        if (responseCode != 22) revert AssociationFailed(responseCode);
    }
}
