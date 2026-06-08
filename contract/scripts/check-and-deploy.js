/**
 * Polls the wallet balance every 30 s and auto-deploys when it's sufficient.
 * Run with: node scripts/check-and-deploy.js
 * Stop with: Ctrl+C
 */
import { ethers } from "ethers";
import { execSync } from "child_process";
import "dotenv/config";

const WALLET = "0x0d01d9aAdE4154D06223887B6ed0B97e5b36D736";
const RPC = process.env.SEPOLIA_RPC_URL ||
  `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`;

const provider = new ethers.JsonRpcProvider(RPC);

// Gas estimates (conservative)
const BADGE_GAS   = 900_000n;
const ESCROW_GAS  = 1_300_000n;
const TRANSFER_GAS = 50_000n;
const TOTAL_GAS   = BADGE_GAS + ESCROW_GAS + TRANSFER_GAS;

async function check() {
  const fee     = await provider.getFeeData();
  const balance = await provider.getBalance(WALLET);
  const gp      = fee.maxFeePerGas ?? fee.gasPrice ?? 10n * 10n ** 9n;
  const needed  = TOTAL_GAS * gp;

  console.log(
    `[${new Date().toLocaleTimeString()}]  ` +
    `Balance: ${ethers.formatEther(balance)} ETH  |  ` +
    `Gas: ${ethers.formatUnits(gp, "gwei")} gwei  |  ` +
    `Need: ${ethers.formatEther(needed)} ETH`
  );

  if (balance >= needed) {
    console.log("\n✅ Sufficient balance — deploying now!\n");
    execSync("npx hardhat --network sepolia run scripts/deploy.js", {
      stdio: "inherit",
      cwd: new URL(".", import.meta.url).pathname,
    });
    process.exit(0);
  }

  const shortfall = needed - balance;
  console.log(`   ↳ Send at least ${ethers.formatEther(shortfall + ethers.parseEther("0.005"))} ETH to: ${WALLET}`);
}

console.log(`Monitoring wallet ${WALLET} every 30 s…  (Ctrl+C to stop)\n`);
check();
setInterval(check, 30_000);
