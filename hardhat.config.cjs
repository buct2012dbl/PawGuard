require("@nomiclabs/hardhat-waffle");
require("dotenv/config");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    artifacts: "./frontend/src/artifacts",
    sources: "./contracts",
    cache: "./cache",
    tests: "./test"
  },
  networks: {
    hardhat: {
      chainId: 31337 // Localhost for development
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    // You can add other networks here, e.g., for Goerli, Sepolia, etc.
    // goerli: {
    //   url: process.env.ALCHEMY_GOERLI_URL || "",
    //   accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },
  },
  mocha: {
    timeout: 20000 // 20 seconds
  }
};

module.exports = config;
