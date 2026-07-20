// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockERC20
/// @notice Testnet ERC-20 with a built-in, rate-limited faucet and a minter
///         role so protocol contracts (e.g. the yield vault) can mint rewards.
/// @dev    FOR TESTNET USE ONLY. The faucet and minter role make this token
///         worthless by design — never deploy a configuration like this to
///         mainnet with real value at stake.
contract MockERC20 is ERC20, Ownable {
    /// @notice Amount dispensed per successful faucet claim (whole-token units, 18 decimals).
    uint256 public immutable faucetAmount;

    /// @notice Minimum time between two faucet claims by the same address.
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    /// @notice Last timestamp at which an address used the faucet.
    mapping(address => uint256) public lastFaucetClaim;

    /// @notice Addresses allowed to mint (protocol contracts set by the owner).
    mapping(address => bool) public isMinter;

    event FaucetClaim(address indexed account, uint256 amount);
    event MinterUpdated(address indexed minter, bool allowed);

    error FaucetOnCooldown(uint256 nextClaimAt);
    error NotMinter();

    modifier onlyMinter() {
        if (!isMinter[msg.sender]) revert NotMinter();
        _;
    }

    /// @param name_          Token name.
    /// @param symbol_        Token symbol.
    /// @param faucetAmount_  Amount minted per faucet claim.
    /// @param initialSupply  Supply minted to the deployer (used to seed liquidity).
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 faucetAmount_,
        uint256 initialSupply
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        faucetAmount = faucetAmount_;
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    /// @notice Claim free testnet tokens. Callable once per cooldown period.
    function faucet() external {
        uint256 last = lastFaucetClaim[msg.sender];
        uint256 nextAllowed = last + FAUCET_COOLDOWN;
        if (last != 0 && block.timestamp < nextAllowed) revert FaucetOnCooldown(nextAllowed);
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
        emit FaucetClaim(msg.sender, faucetAmount);
    }

    /// @notice Seconds until `account` can use the faucet again (0 if claimable now).
    function faucetCooldownRemaining(address account) external view returns (uint256) {
        uint256 last = lastFaucetClaim[account];
        if (last == 0) return 0;
        uint256 nextAllowed = last + FAUCET_COOLDOWN;
        return block.timestamp >= nextAllowed ? 0 : nextAllowed - block.timestamp;
    }

    /// @notice Grant or revoke the minter role.
    function setMinter(address minter, bool allowed) external onlyOwner {
        isMinter[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    /// @notice Mint tokens. Restricted to addresses with the minter role.
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}
