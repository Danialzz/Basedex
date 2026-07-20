// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {SimplePair} from "../src/SimplePair.sol";
import {YieldVault} from "../src/YieldVault.sol";

/// @title Deploy
/// @notice Deploys the full BaseDex demo stack to Base Sepolia and seeds the
///         pool with initial liquidity:
///           1. mUSDC  — mock stablecoin (faucet: 1,000 / day)
///           2. mETH   — mock volatile asset (faucet: 0.25 / day)
///           3. SimplePair (mUSDC/mETH AMM pool)
///           4. YieldVault (ERC-4626 on mUSDC, simulated ~10% APY at 1M TVL)
///         Deployment addresses are written to `deployments/` AND to the
///         frontend config at `../src/config/deployments.json`, so the UI
///         switches from demo mode to live mode automatically.
///
/// @dev Usage:
///        cp ../.env.example .env   # fill in PRIVATE_KEY
///        source .env
///        forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
contract Deploy is Script {
    // Seed liquidity: 200,000 mUSDC + 100 mETH → implied price 2,000 mUSDC/mETH
    uint256 constant SEED_USDC = 200_000e18;
    uint256 constant SEED_METH = 100e18;

    // ≈10% APY when the vault holds 1,000,000 mUSDC (100k per year, per second)
    uint256 constant REWARD_RATE = 3_170_979_198_376_141;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        // 1. Mock tokens (faucet amount, initial supply to deployer)
        MockERC20 usdc = new MockERC20("Mock USD Coin", "mUSDC", 1_000e18, 10_000_000e18);
        MockERC20 meth = new MockERC20("Mock Ether", "mETH", 0.25e18, 10_000_000e18);

        // 2. AMM pair
        SimplePair pair = new SimplePair(address(usdc), address(meth));

        // 3. Yield vault on mUSDC + grant it the minter role for simulated yield
        YieldVault vault = new YieldVault(usdc, REWARD_RATE);
        usdc.setMinter(address(vault), true);

        // 4. Seed liquidity (arguments must follow token0/token1 ordering)
        (uint256 seed0, uint256 seed1) = address(usdc) < address(meth)
            ? (SEED_USDC, SEED_METH)
            : (SEED_METH, SEED_USDC);
        usdc.approve(address(pair), SEED_USDC);
        meth.approve(address(pair), SEED_METH);
        pair.addLiquidity(seed0, seed1, 0, 0, deployer, block.timestamp + 600);

        vm.stopBroadcast();

        console2.log("mUSDC:     ", address(usdc));
        console2.log("mETH:      ", address(meth));
        console2.log("SimplePair:", address(pair));
        console2.log("YieldVault:", address(vault));

        _writeDeployment(usdc, meth, pair, vault, deployer);
    }

    function _writeDeployment(
        MockERC20 usdc,
        MockERC20 meth,
        SimplePair pair,
        YieldVault vault,
        address deployer
    ) internal {
        string memory key = "deployment";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "deployer", deployer);
        vm.serializeAddress(key, "mUSDC", address(usdc));
        vm.serializeAddress(key, "mETH", address(meth));
        vm.serializeAddress(key, "pair", address(pair));
        vm.serializeAddress(key, "vault", address(vault));
        string memory json = vm.serializeUint(key, "deployedAt", block.timestamp);

        vm.writeJson(json, "deployments/latest.json");
        // Feeds the frontend config — flips the UI from demo mode to live mode
        vm.writeJson(json, "../src/config/deployments.json");
        console2.log("Wrote deployments/latest.json and src/config/deployments.json");
    }
}
