// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HederaDestPool} from "../src/hedera/HederaDestPool.sol";

/// Deploys HederaDestPool only — does NOT call associateToken() in the same
/// script. See DeployHederaSourceVault.s.sol for why: forge script's
/// pre-broadcast dry run has no real HTS precompile at 0x167 to call
/// against. Run AssociateHederaContract.s.sol against the printed address
/// right after this, before funding the pool.
contract DeployHederaDestPool is Script {
    function run() external returns (HederaDestPool) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address token = vm.envAddress("USDC_ADDRESS");
        address relayer = vm.envAddress("RELAYER_ADDRESS");
        address owner = vm.envAddress("OWNER_ADDRESS");
        uint256 feeBps = vm.envUint("FEE_BPS");

        vm.startBroadcast(privateKey);
        HederaDestPool pool = new HederaDestPool(token, relayer, owner, feeBps);
        vm.stopBroadcast();

        console2.log("HederaDestPool deployed at:", address(pool));
        console2.log("Now run AssociateHederaContract.s.sol against this address before funding/using it.");
        return pool;
    }
}
