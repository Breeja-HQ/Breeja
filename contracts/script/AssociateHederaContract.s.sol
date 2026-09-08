// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

interface IAssociable {
    function associateToken() external;
}

/// Calls associateToken() on an already-deployed HederaSourceVault or
/// HederaDestPool. Kept as its own script (rather than folded into the
/// deploy script) because forge script's pre-broadcast simulation runs
/// against a local EVM fork with no real HTS precompile at 0x167 — a
/// simulated call to it reverts (INVALID opcode) even though the identical
/// call succeeds once actually broadcast to a real Hedera node. Running
/// this as its own broadcast-only step sidesteps that: forge still
/// simulates first, so this call needs CONTRACT_ADDRESS to point at a
/// contract that is unassociated (a second run against an already-associated
/// contract will also fail simulation, harmlessly, since Hedera returns a
/// non-SUCCESS response code for an already-associated account/token pair).
///
/// Usage (from contracts/):
///   PRIVATE_KEY=$HEDERA_TESTNET_PRIVATE_KEY \
///   CONTRACT_ADDRESS=<vault or pool address> \
///   forge script script/AssociateHederaContract.s.sol:AssociateHederaContract \
///     --rpc-url $HEDERA_TESTNET_RPC_URL --broadcast --legacy
contract AssociateHederaContract is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address target = vm.envAddress("CONTRACT_ADDRESS");

        vm.startBroadcast(privateKey);
        IAssociable(target).associateToken();
        vm.stopBroadcast();

        console2.log("Associated:", target);
    }
}
