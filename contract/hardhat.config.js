import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import "dotenv/config";

const INFURA_KEY = process.env.INFURA_API_KEY;
const SEPOLIA_URL =
  process.env.SEPOLIA_RPC_URL ||
  (INFURA_KEY ? `https://sepolia.infura.io/v3/${INFURA_KEY}` : "");

const ACCOUNTS = process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [];
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? "";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },
  networks: {
    ...(SEPOLIA_URL
      ? {
          sepolia: {
            type: "http",
            chainType: "l1",
            url: SEPOLIA_URL,
            accounts: ACCOUNTS,
          },
        }
      : {}),
  },
  verify: {
    etherscan: {
      apiKey: ETHERSCAN_API_KEY,
    },
  },
});
