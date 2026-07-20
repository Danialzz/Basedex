// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {SimplePair} from "../src/SimplePair.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimplePairTest is Test {
    MockERC20 usdc;
    MockERC20 meth;
    SimplePair pair;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant SEED0_USDC = 200_000e18;
    uint256 constant SEED1_METH = 100e18;

    function setUp() public {
        usdc = new MockERC20("Mock USD Coin", "mUSDC", 1_000e18, 10_000_000e18);
        meth = new MockERC20("Mock Ether", "mETH", 0.25e18, 10_000_000e18);
        pair = new SimplePair(address(usdc), address(meth));

        usdc.transfer(alice, 100_000e18);
        meth.transfer(alice, 50e18);
        usdc.transfer(bob, 10_000e18);
        meth.transfer(bob, 5e18);

        // Seed pool: price = 2,000 mUSDC per mETH
        (uint256 seed0, uint256 seed1) = address(usdc) < address(meth)
            ? (SEED0_USDC, SEED1_METH)
            : (SEED1_METH, SEED0_USDC);
        usdc.approve(address(pair), type(uint256).max);
        meth.approve(address(pair), type(uint256).max);
        pair.addLiquidity(seed0, seed1, 0, 0, address(this), block.timestamp + 1);
    }

    function _isUsdcToken0() internal view returns (bool) {
        return pair.token0() == address(usdc);
    }

    function test_InitialLiquidity() public view {
        (uint112 r0, uint112 r1) = pair.getReserves();
        (uint256 usdcReserve, uint256 methReserve) =
            _isUsdcToken0() ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
        assertEq(usdcReserve, SEED0_USDC);
        assertEq(methReserve, SEED1_METH);

        // Deployer holds sqrt(x*y) - MINIMUM_LIQUIDITY
        uint256 expected = _sqrt(SEED0_USDC * SEED1_METH) - pair.MINIMUM_LIQUIDITY();
        assertEq(pair.balanceOf(address(this)), expected);
        assertEq(pair.balanceOf(address(0xdead)), pair.MINIMUM_LIQUIDITY());
    }

    function test_AddLiquidityOptimalAmounts() public {
        vm.startPrank(alice);
        usdc.approve(address(pair), type(uint256).max);
        meth.approve(address(pair), type(uint256).max);

        // Alice offers too much mETH — pair should only take the proportional amount
        (uint256 d0, uint256 d1) = _sortAmounts(20_000e18, 20e18);
        (uint256 a0, uint256 a1, uint256 liq) =
            pair.addLiquidity(d0, d1, 0, 0, alice, block.timestamp + 1);
        vm.stopPrank();

        (uint256 usdcIn, uint256 methIn) = _isUsdcToken0() ? (a0, a1) : (a1, a0);
        assertEq(usdcIn, 20_000e18);
        assertEq(methIn, 10e18); // 20_000 / 2_000
        assertGt(liq, 0);
    }

    function test_SwapExactIn() public {
        vm.startPrank(bob);
        usdc.approve(address(pair), type(uint256).max);

        (uint112 r0, uint112 r1) = pair.getReserves();
        (uint256 reserveIn, uint256 reserveOut) = _isUsdcToken0()
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));

        uint256 amountIn = 2_000e18;
        uint256 expectedOut = pair.getAmountOut(amountIn, reserveIn, reserveOut);

        uint256 methBefore = meth.balanceOf(bob);
        uint256 out = pair.swapExactIn(
            address(usdc), amountIn, expectedOut, bob, block.timestamp + 1
        );
        vm.stopPrank();

        assertEq(out, expectedOut);
        assertEq(meth.balanceOf(bob) - methBefore, expectedOut);
        // ~1 mETH minus 0.3% fee and ~1% price impact
        assertGt(out, 0.98e18);
        assertLt(out, 1e18);
    }

    function test_SwapChargesFeeAndGrowsK() public {
        (uint112 r0Before, uint112 r1Before) = pair.getReserves();
        uint256 kBefore = uint256(r0Before) * uint256(r1Before);

        vm.startPrank(bob);
        usdc.approve(address(pair), type(uint256).max);
        pair.swapExactIn(address(usdc), 2_000e18, 0, bob, block.timestamp + 1);
        vm.stopPrank();

        (uint112 r0After, uint112 r1After) = pair.getReserves();
        uint256 kAfter = uint256(r0After) * uint256(r1After);
        assertGt(kAfter, kBefore); // 0.3% fee accrues to LPs
    }

    function test_SwapRevertsOnSlippage() public {
        vm.startPrank(bob);
        usdc.approve(address(pair), type(uint256).max);
        vm.expectRevert(SimplePair.Slippage.selector);
        pair.swapExactIn(address(usdc), 2_000e18, 1e18, bob, block.timestamp + 1); // min out too high
        vm.stopPrank();
    }

    function test_RemoveLiquidity() public {
        uint256 lpBalance = pair.balanceOf(address(this));
        uint256 half = lpBalance / 2;

        uint256 usdcBefore = usdc.balanceOf(address(this));
        pair.approve(address(pair), half);
        (uint256 a0, uint256 a1) = pair.removeLiquidity(half, 0, 0, address(this), block.timestamp + 1);

        (uint256 usdcOut, uint256 methOut) = _isUsdcToken0() ? (a0, a1) : (a1, a0);
        assertApproxEqRel(usdcOut, SEED0_USDC / 2, 0.01e18);
        assertApproxEqRel(methOut, SEED1_METH / 2, 0.01e18);
        assertEq(usdc.balanceOf(address(this)), usdcBefore + usdcOut);
    }

    function test_QuoteMatchesPrice() public view {
        (uint112 r0, uint112 r1) = pair.getReserves();
        (uint256 usdcReserve, uint256 methReserve) =
            _isUsdcToken0() ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
        uint256 price = pair.quote(1e18, methReserve, usdcReserve);
        assertEq(price, 2_000e18); // 1 mETH = 2,000 mUSDC
    }

    function test_RevertOnExpiredDeadline() public {
        vm.startPrank(bob);
        usdc.approve(address(pair), type(uint256).max);
        vm.expectRevert(SimplePair.Expired.selector);
        pair.swapExactIn(address(usdc), 100e18, 0, bob, block.timestamp - 1);
        vm.stopPrank();
    }

    // -- helpers --------------------------------------------------------

    function _sortAmounts(uint256 usdcAmt, uint256 methAmt)
        internal
        view
        returns (uint256, uint256)
    {
        return _isUsdcToken0() ? (usdcAmt, methAmt) : (methAmt, usdcAmt);
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
