// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMockERC20 {
    function mint(address to, uint256 amount) external;
}

/// @title YieldVault
/// @notice ERC-4626 tokenized vault. Depositors receive shares that grow in
///         value as yield accrues linearly over time at `rewardRate` (asset
///         wei per second).
/// @dev    Yield is *simulated*: this vault holds the minter role on a
///         MockERC20 asset and mints rewards into itself. On mainnet the same
///         share-accounting pattern would be fed by a real yield source
///         (lending, staking, LP fees) instead of minting.
contract YieldVault is ERC4626, Ownable, ReentrancyGuard {
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant BPS = 10_000;

    /// @notice Reward emission rate in asset wei per second.
    uint256 public rewardRate;

    /// @notice Last timestamp at which rewards were accounted.
    uint256 public lastAccrual;

    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event YieldAccrued(uint256 amount, uint256 totalAssetsAfter);

    error ZeroRewardRate();

    /// @param asset_          The underlying MockERC20 (must grant this vault its minter role).
    /// @param rewardRate_     Initial emission rate in asset wei/second (0 to start paused).
    constructor(IERC20 asset_, uint256 rewardRate_)
        ERC20("BaseVault Share", "bvUSD")
        ERC4626(asset_)
        Ownable(msg.sender)
    {
        rewardRate = rewardRate_;
        lastAccrual = block.timestamp;
    }

    // ------------------------------------------------------------------
    //  Views
    // ------------------------------------------------------------------

    /// @notice Yield earned but not yet minted into the vault.
    function pendingYield() public view returns (uint256) {
        return rewardRate * (block.timestamp - lastAccrual);
    }

    /// @notice Total assets managed, including un-minted accrued yield.
    /// @dev    Overriding this keeps convertToShares / convertToAssets and all
    ///         ERC-4626 previews accurate *between* accrual mints.
    function totalAssets() public view override returns (uint256) {
        return super.totalAssets() + pendingYield();
    }

    /// @notice Current implied APY in basis points, assuming the TVL and
    ///         emission rate stay constant. Returns 0 when the vault is empty.
    function apyBps() public view returns (uint256) {
        uint256 tvl = totalAssets();
        if (tvl == 0) return 0;
        return (rewardRate * SECONDS_PER_YEAR * BPS) / tvl;
    }

    // ------------------------------------------------------------------
    //  Admin
    // ------------------------------------------------------------------

    /// @notice Update the emission rate. Accrues pending yield first so the
    ///         old rate is fully accounted before the change.
    function setRewardRate(uint256 newRate) external onlyOwner {
        _accrue();
        emit RewardRateUpdated(rewardRate, newRate);
        rewardRate = newRate;
    }

    /// @notice Permissionlessly mint accrued yield into the vault (keeper-friendly).
    function accrue() external nonReentrant {
        _accrue();
    }

    // ------------------------------------------------------------------
    //  ERC-4626 hooks — always accrue before share math touches balances
    // ------------------------------------------------------------------

    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal
        override
        nonReentrant
    {
        _accrue();
        super._deposit(caller, receiver, assets, shares);
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        _accrue();
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    // ------------------------------------------------------------------
    //  Internals
    // ------------------------------------------------------------------

    /// @dev Mint pending yield into the vault so every share appreciates.
    ///      Requires this contract to hold the minter role on the asset.
    function _accrue() internal {
        uint256 pending = pendingYield();
        lastAccrual = block.timestamp;
        if (pending > 0) {
            IMockERC20(asset()).mint(address(this), pending);
            emit YieldAccrued(pending, super.totalAssets());
        }
    }
}
