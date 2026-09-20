const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");
const path = require("path");
const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("❌ Λείπει το ADMIN_PRIVATE_KEY από τα GitHub Secrets / Env variables!");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const contractSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GreenMetricsCoin is ERC20, Ownable {
    constructor() ERC20("GreenMetrics Coin", "GMC") Ownable(msg.sender) {}

    function rewardRecycling(address citizen, uint256 amount) external onlyOwner {
        _mint(citizen, amount);
    }

    function redeemMerchantCoins(address merchant, uint256 amount) external onlyOwner {
        _burn(merchant, amount);
    }
}
`;

function findImports(importPath) {
  if (importPath.startsWith("@openzeppelin/")) {
    const fullPath = path.resolve(__dirname, "node_modules", importPath);
    return { contents: fs.readFileSync(fullPath, "utf8") };
  }
  return { error: "File not found" };
}

async function main() {
  console.log("Compiling Smart Contract...");
  const input = {
    language: "Solidity",
    sources: { "GreenMetrics.sol": { content: contractSource } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  const contractFile = output.contracts["GreenMetrics.sol"]["GreenMetricsCoin"];
  
  const balance = await provider.getBalance(wallet.address);
  console.log("Admin Wallet:", wallet.address, "| Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Το wallet δεν έχει Sepolia ETH για gas fees!");
  }

  console.log("🚀 Deploying GreenMetrics Coin to Sepolia...");
  const factory = new ethers.ContractFactory(contractFile.abi, contractFile.evm.bytecode.object, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n==========================================");
  console.log("🎉 GREENMETRICS COIN DEPLOYED SUCCESSFULLY!");
  console.log("NEW_CONTRACT_ADDRESS =", address);
  console.log("==========================================\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
