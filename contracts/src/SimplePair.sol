// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title SimplePair
/// @notice A minimal constant-product (x * y = k) AMM pool for two ERC-20
///         tokens, modelled on Uniswap V2. Liquidity providers receive LP
///         tokens representing their share of the pool; every swap pays a
///         0.30% fee that accrues to LPs.
/// @dev    Single-pool design: no factory, no router. The frontend calls this
///         contract directly. Intentionally small and audit-friendly for
///         educational/testnet use.
contract SimplePair is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice LP tokens permanently locked on first mint to prevent division by zero.
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    /// @notice Swap fee: 0.30% (30 bps) stays in the pool.
    uint256 private constant FEE_NUMERATOR = 997; // amountIn kept after fee, per 1000
    uint256 private constant FEE_DENOMINATOR = 1000;

    /// @notice Pool tokens, sorted by address (token0 < token1).
    address public immutable token0;
    address public immutable token1;

    /// @notice Cached reserves (single storage slot read pattern).
    uint112 private reserve0;
    uint112 private reserve1;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    error InvalidToken();
    error InsufficientLiquidity();
    error InsufficientOutputAmount();
    error InvalidTo();
    error InsufficientInputAmount();
    error InvariantK();
    error Expired();
    error Slippage();

    modifier ensure(uint256 deadline) {
        if (block.timestamp > deadline) revert Expired();
        _;
    }

    constructor(address tokenA, address tokenB)
        ERC20("BaseSwap LP Token", "BS-LP")
    {
        if (tokenA == tokenB || tokenA == address(0) || tokenB == address(0)) {
            revert InvalidToken();
        }
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    // ------------------------------------------------------------------
    //  Views
    // ------------------------------------------------------------------

    /// @notice Current reserves and the tokens they belong to.
    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
    }

    /// @notice Equivalent output of token B for `amountA` of token A at current reserves.
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256) {
        if (amountA == 0) revert InsufficientInputAmount();
        if (reserveA == 0 || reserveB == 0) revert InsufficientLiquidity();
        return (amountA * reserveB) / reserveA;
    }

    /// @notice Output amount for an exact input, after the 0.30% fee.
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256)
    {
        if (amountIn == 0) revert InsufficientInputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        return (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    /// @notice Input amount required for an exact output, after the 0.30% fee.
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256)
    {
        if (amountOut == 0) revert InsufficientOutputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        uint256 numerator = reserveIn * amountOut * FEE_DENOMINATOR;
        uint256 denominator = (reserveOut - amountOut) * FEE_NUMERATOR;
        return (numerator / denominator) + 1;
    }

    // ------------------------------------------------------------------
    //  Liquidity
    // ------------------------------------------------------------------

    /// @notice Add liquidity. The pair pulls tokens from `msg.sender` and mints
    ///         LP tokens to `to`. Amounts are optimised against current reserves
    ///         (excess is simply not taken) and bounded by the min parameters.
    /// @return amount0    token0 actually deposited
    /// @return amount1    token1 actually deposited
    /// @return liquidity  LP tokens minted
    function addLiquidity(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 amount0, uint256 amount1, uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1) = getReserves();

        if (_reserve0 == 0 && _reserve1 == 0) {
            (amount0, amount1) = (amount0Desired, amount1Desired);
        } else {
            uint256 amount1Optimal = quote(amount0Desired, _reserve0, _reserve1);
            if (amount1Optimal <= amount1Desired) {
                if (amount1Optimal < amount1Min) revert Slippage();
                (amount0, amount1) = (amount0Desired, amount1Optimal);
            } else {
                uint256 amount0Optimal = quote(amount1Desired, _reserve1, _reserve0);
                assert(amount0Optimal <= amount0Desired);
                if (amount0Optimal < amount0Min) revert Slippage();
                (amount0, amount1) = (amount0Optimal, amount1Desired);
            }
        }

        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        liquidity = _mintLP(to);
        emit Mint(msg.sender, amount0, amount1, liquidity);
    }

    /// @notice Remove liquidity. Burns `liquidity` LP tokens (pulled from
    ///         `msg.sender`) and sends the proportional underlying to `to`.
    function removeLiquidity(
        uint256 liquidity,
        uint256 amount0Min,
        uint256 amount1Min,
        address to,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 amount0, uint256 amount1) {
        IERC20(address(this)).safeTransferFrom(msg.sender, address(this), liquidity);
        (amount0, amount1) = _burnLP(to);
        if (amount0 < amount0Min || amount1 < amount1Min) revert Slippage();
        emit Burn(msg.sender, amount0, amount1, to);
    }

    // ------------------------------------------------------------------
    //  Swaps
    // ------------------------------------------------------------------

    /// @notice Low-level swap, Uniswap V2 style: caller transfers input tokens
    ///         to the pair first, then requests output. `amount0Out` /
    ///         `amount1Out`: one of them must be zero.
    function swap(uint256 amount0Out, uint256 amount1Out, address to)
        external
        nonReentrant
    {
        _swap(amount0Out, amount1Out, to);
    }

    /// @notice Convenience: swap an exact amount of `tokenIn` for as much of the
    ///         other token as possible. Handles the transfer + low-level swap.
    /// @return amountOut tokens received
    function swapExactIn(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 amountOut) {
        if (tokenIn != token0 && tokenIn != token1) revert InvalidToken();
        (uint112 _reserve0, uint112 _reserve1) = getReserves();
        (uint256 reserveIn, uint256 reserveOut) =
            tokenIn == token0 ? (uint256(_reserve0), uint256(_reserve1)) : (uint256(_reserve1), uint256(_reserve0));

        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut < amountOutMin) revert Slippage();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        (uint256 amount0Out, uint256 amount1Out) =
            tokenIn == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
        _swap(amount0Out, amount1Out, to);
    }

    /// @dev Core swap routine: sends outputs, then verifies the fee-adjusted
    ///      invariant against whatever inputs were actually transferred in.
    function _swap(uint256 amount0Out, uint256 amount1Out, address to) internal {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();
        (uint112 _reserve0, uint112 _reserve1) = getReserves();
        if (amount0Out >= _reserve0 || amount1Out >= _reserve1) revert InsufficientLiquidity();
        if (to == token0 || to == token1) revert InvalidTo();

        if (amount0Out > 0) IERC20(token0).safeTransfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).safeTransfer(to, amount1Out);

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        if (amount0In == 0 && amount1In == 0) revert InsufficientInputAmount();

        // Invariant with fee: (balance * 1000 - amountIn * 3) keeps k non-decreasing.
        uint256 balance0Adjusted = balance0 * FEE_DENOMINATOR - amount0In * (FEE_DENOMINATOR - FEE_NUMERATOR);
        uint256 balance1Adjusted = balance1 * FEE_DENOMINATOR - amount1In * (FEE_DENOMINATOR - FEE_NUMERATOR);
        if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * uint256(_reserve1) * (FEE_DENOMINATOR ** 2)) {
            revert InvariantK();
        }

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    // ------------------------------------------------------------------
    //  Internals
    // ------------------------------------------------------------------

    /// @dev Mint LP tokens based on the difference between actual balances and cached reserves.
    function _mintLP(address to) internal returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0xdead), MINIMUM_LIQUIDITY); // permanently locked
        } else {
            liquidity = Math.min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }
        if (liquidity == 0) revert InsufficientLiquidity();
        _mint(to, liquidity);
        _update(balance0, balance1);
    }

    /// @dev Burn LP tokens held by the pair and pay out proportional underlying.
    function _burnLP(address to) internal returns (uint256 amount0, uint256 amount1) {
        uint256 liquidity = balanceOf(address(this));
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 _totalSupply = totalSupply();

        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        _burn(address(this), liquidity);
        IERC20(token0).safeTransfer(to, amount0);
        IERC20(token1).safeTransfer(to, amount1);
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)));
    }

    /// @dev Update cached reserves to match actual balances.
    function _update(uint256 balance0, uint256 balance1) private {
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        emit Sync(reserve0, reserve1);
    }

    /// @notice Force reserves to match balances (recover donated tokens).
    function sync() external {
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)));
    }
}
