// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SourceVault} from "../SourceVault.sol";
import {IHederaTokenService} from "../interfaces/IHederaTokenService.sol";

/// USDC on Hedera Testnet is an HTS token whose ERC-20 facade does not
/// implement EIP-3009 (verified on-chain: DOMAIN_SEPARATOR() and
/// authorizationState() both return empty data against the real token at
/// 0.0.429274 — see docs/CHAINS.md). depositWithAuthorization is therefore
/// unusable on this chain; the relayer calls the inherited deposit()
/// fallback instead, which requires payer -> vault approve() first.
/// A contract account also needs its own HTS token association before it
/// can receive a transfer, which has no ERC-20 analogue — this adds the one
/// function that does it, gated to the relayer like every other vault call.
contract HederaSourceVault is SourceVault {
    address private constant HTS_PRECOMPILE = 0x0000000000000000000000000000000000000167;

    error AssociationFailed(int64 responseCode);

    constructor(address token_, address relayer_) SourceVault(token_, relayer_) {}

    function associateToken() external {
        if (msg.sender != relayer) revert NotRelayer();
        int64 responseCode = IHederaTokenService(HTS_PRECOMPILE).associateToken(address(this), address(token));
        if (responseCode != 22) revert AssociationFailed(responseCode);
    }
}
