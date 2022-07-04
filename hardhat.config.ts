import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

import "./deploy/index";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: "0.8.4",
  networks: {
    hardhat: {
      hardfork: "istanbul",
      gas: 9500000,
      chainId: 31337,
      accounts: {
        count: 10,
        mnemonic: "horn horn horn horn horn horn horn horn horn horn horn horn",
        path: "m/44'/60'/0'/0",
      },
    },
    // rinkeby: {
    //   url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
    //   accounts: [process.env.PRIVATE_KEY || ""],
    // },
    // mainnet: {
    //   url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    //   accounts: [process.env.PRIVATE_KEY || ""],
    // },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: "./build/typechain",
    target: "ethers-v5",
  },
  paths: {
    sources: "contracts",
    artifacts: "./build/artifacts",
    cache: "./build/cache",
  },
};

export default config;
