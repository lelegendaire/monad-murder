// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {MurderGame} from "../src/MurderGame.sol";

contract DeployMurderGame is Script {
    function run() external returns (MurderGame murderGame) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);

        murderGame = new MurderGame();

        vm.stopBroadcast();
    }
}