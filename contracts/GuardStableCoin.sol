// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// This is a simplified representation of a stablecoin.
// In a real-world scenario, this would involve complex collateral management
// or algorithmic stability mechanisms. For this project, we'll assume it's backed
// by an off-chain asset or another stable token (e.g., USDC) for simplicity.
contract GuardStableCoin is ERC20, Ownable {
    // For demonstration, we'll allow the owner to mint/burn to simulate stability ops.
    // In a production system, these functions would be tied to complex pegging mechanisms.

    constructor() ERC20("$GUARD", "GUARD") Ownable(msg.sender) {
        _mint(msg.sender, 100000 * 10 ** decimals()); // Mint initial supply to deployer
    }

    // Only owner can mint new tokens (simulates collateralization/algorithmic issuance)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // Only owner can burn tokens (simulates de-collateralization/algorithmic burning)
    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
}
