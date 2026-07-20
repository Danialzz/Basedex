// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {YieldVault} from "../src/YieldVault.sol";

contract YieldVaultTest is Test {
    MockERC20 usdc;
    YieldVault vault;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    // ≈10% APY at 1,000,000 mUSDC TVL
    uint256 constant REWARD_RATE = 3_170_979_198_376_141;

    function setUp() public {
        usdc = new MockERC20("Mock USD Coin", "mUSDC", 1_000e18, 10_000_000e18);
        vault = new YieldVault(usdc, REWARD_RATE);
        usdc.setMinter(address(vault), true);

        usdc.transfer(alice, 2_000_000e18);
        usdc.transfer(bob, 2_000_000e18);

        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_DepositMintsSharesOneToOne() public {
        vm.prank(alice);
        uint256 shares = vault.deposit(1_000e18, alice);
        assertEq(shares, 1_000e18);
        assertEq(vault.balanceOf(alice), 1_000e18);
        assertEq(vault.totalAssets(), 1_000e18);
    }

    function test_YieldAccruesOverTime() public {
        vm.prank(alice);
        vault.deposit(1_000_000e18, alice);

        skip(30 days);

        uint256 expected = REWARD_RATE * 30 days;
        assertEq(vault.pendingYield(), expected);
        assertEq(vault.totalAssets(), 1_000_000e18 + expected);

        // Share price appreciated ~0.82% in 30 days (10% APY)
        uint256 pricePerShare = vault.convertToAssets(1e18);
        assertGt(pricePerShare, 1e18);
    }

    function test_WithdrawClaimsYield() public {
        vm.prank(alice);
        vault.deposit(1_000_000e18, alice);

        skip(365 days);

        uint256 assetsBefore = usdc.balanceOf(alice);
        uint256 shares = vault.balanceOf(alice);
        vm.prank(alice);
        uint256 assets = vault.redeem(shares, alice, alice);

        // ~10% APY → ~1.1M back (small rounding, minted at redeem time)
        assertApproxEqRel(assets, 1_100_000e18, 0.001e18);
        assertEq(usdc.balanceOf(alice), assetsBefore + assets);
    }

    function test_LateDepositorGetsFairSharePrice() public {
        vm.prank(alice);
        vault.deposit(1_000_000e18, alice);

        skip(365 days); // vault grows to ~1.1M

        vm.prank(bob);
        uint256 bobShares = vault.deposit(1_100_000e18, bob);

        // Bob deposited roughly the current vault value → ≈1M shares, not 1.1M
        assertApproxEqRel(bobShares, 1_000_000e18, 0.01e18);
    }

    function test_ApyBps() public {
        vm.prank(alice);
        vault.deposit(1_000_000e18, alice);
        assertApproxEqRel(vault.apyBps(), 1_000, 0.001e18); // ~10% = 1000 bps
    }

    function test_SetRewardRateAccruesFirst() public {
        vm.prank(alice);
        vault.deposit(1_000_000e18, alice);

        skip(10 days);
        uint256 pendingBefore = vault.pendingYield();
        assertGt(pendingBefore, 0);

        vault.setRewardRate(REWARD_RATE * 2);

        // Pending was minted into the vault; rate doubled going forward
        assertEq(vault.pendingYield(), 0);
        assertEq(vault.rewardRate(), REWARD_RATE * 2);
        assertEq(usdc.balanceOf(address(vault)), 1_000_000e18 + pendingBefore);
    }

    function test_OnlyOwnerSetsRate() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setRewardRate(1);
    }
}
