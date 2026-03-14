/**
 * contracts/evm/scripts/deploy.ts
 *
 * Deploys the ShelbyNFTFactory contract to the target network.
 * Saves deployed addresses to deployed-addresses.json.
 * Supports: sepolia, polygon-mumbai, hardhat
 *
 * Usage:
 *   npm run deploy:sepolia
 *   npm run deploy:polygon-mumbai
 *   npm run deploy:local
 *
 * After deploying: copy the factory address into backend/.env as
 *   EVM_FACTORY_ADDRESS=0x...   (for Sepolia)
 *   POLYGON_FACTORY_ADDRESS=0x...  (for Polygon Mumbai)
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n🔥 NFT Foundry — EVM Contract Deployment");
  console.log("─────────────────────────────────────────");
  console.log(`  Network  : ${network.name} (chainId: ${network.chainId})`);
  console.log(`  Deployer : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance  : ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error("\n❌ Deployer has no funds. Get testnet ETH from a faucet.");
    process.exit(1);
  }

  // ── Deploy ShelbyNFTFactory ──────────────────────────────────────────────
  console.log("\n📦 Deploying ShelbyNFTFactory...");

  const Factory = await ethers.getContractFactory("ShelbyNFTFactory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  const deployTx = factory.deploymentTransaction();

  console.log(`\n✅ ShelbyNFTFactory deployed!`);
  console.log(`   Address : ${factoryAddress}`);
  console.log(`   Tx hash : ${deployTx?.hash}`);

  // ── Save addresses ────────────────────────────────────────────────────────
  const outputPath = path.join(__dirname, "../deployed-addresses.json");

  // Load existing addresses if file exists (to preserve other networks)
  let existingAddresses: Record<string, unknown> = {};
  if (fs.existsSync(outputPath)) {
    try {
      existingAddresses = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    } catch {
      // Ignore parse errors
    }
  }

  const updated = {
    ...existingAddresses,
    [network.name !== "unknown" ? network.name : `chain-${network.chainId}`]: {
      factory: factoryAddress,
      chainId: Number(network.chainId),
      deployedAt: new Date().toISOString(),
      deployer: deployer.address,
      txHash: deployTx?.hash,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(updated, null, 2));
  console.log(`\n💾 Addresses saved to deployed-addresses.json`);

  // ── Print next steps ──────────────────────────────────────────────────────
  const envVar =
    Number(network.chainId) === 80001
      ? "POLYGON_FACTORY_ADDRESS"
      : "EVM_FACTORY_ADDRESS";

  console.log("\n─────────────────────────────────────────");
  console.log("📋 Next Steps:");
  console.log(`\n   1. Copy this into backend/.env:`);
  console.log(`      ${envVar}=${factoryAddress}`);
  console.log(`\n   2. (Optional) Verify on explorer:`);
  console.log(`      npm run verify:${network.name} -- ${factoryAddress} ${deployer.address}`);
  console.log("\n─────────────────────────────────────────\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});