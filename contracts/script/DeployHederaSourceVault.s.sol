// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HederaSourceVault} from "../src/hedera/HederaSourceVault.sol";

/// Deploys HederaSourceVault only — does NOT call associateToken() in the
/// same script. forge script always dry-runs a script's calls against a
/// local EVM fork before broadcasting (to estimate gas), and that local
/// fork has no HTS system contract at 0x167: the precompile only exists in
/// real Hedera consensus nodes, so a simulated call to it returns the
/// INVALID opcode (0xfe) and forge script aborts before ever broadcasting
/// anything, even though the same call succeeds for real once actually
/// broadcast. Splitting the association into AssociateHederaContract.s.sol,
/// run separately right after this one, avoids this — see
/// docs/DEPLOYMENTS.md for the real association tx hashes from this
/// project's own deploy, which hit exactly this and worked around it with
/// two separate forge script / cast send calls.
contract DeployHederaSourceVault is Script {
    function run() external returns (HederaSourceVault) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address relayer = vm.envAddress("RELAYER_ADDRESS");

        vm.startBroadcast(privateKey);
        HederaSourceVault vault = new HederaSourceVault(usdc, relayer);
        vm.stopBroadcast();

        console2.log("HederaSourceVault deployed at:", address(vault));
        console2.log("Now run AssociateHederaContract.s.sol against this address before funding/using it.");
        return vault;
    }
}
