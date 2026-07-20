// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract MockERC20Test is Test {
    MockERC20 token;
    address alice = makeAddr("alice");

    function setUp() public {
        token = new MockERC20("Mock USD Coin", "mUSDC", 1_000e18, 10_000_000e18);
    }

    function test_FaucetMints() public {
        vm.prank(alice);
        token.faucet();
        assertEq(token.balanceOf(alice), 1_000e18);
    }

    function test_FaucetCooldown() public {
        vm.startPrank(alice);
        token.faucet();

        vm.expectRevert(abi.encodeWithSelector(
            MockERC20.FaucetOnCooldown.selector,
            block.timestamp + 1 days
        ));
        token.faucet();
        vm.stopPrank();

        assertEq(token.faucetCooldownRemaining(alice), 1 days);

        skip(1 days);
        vm.prank(alice);
        token.faucet();
        assertEq(token.balanceOf(alice), 2_000e18);
    }

    function test_MinterRole() public {
        token.setMinter(alice, true);
        vm.prank(alice);
        token.mint(alice, 5e18);
        assertEq(token.balanceOf(alice), 5e18);
    }

    function test_MintRevertsWithoutRole() public {
        vm.prank(alice);
        vm.expectRevert(MockERC20.NotMinter.selector);
        token.mint(alice, 1);
    }
}
