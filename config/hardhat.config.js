import "@nomiclabs/hardhat-waffle";
import "dotenv/config";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config = {
  solidity: "0.8.0",
  paths: {
    artifacts: "../frontend/src/artifacts",
    sources: "../contracts",
    cache: "./cache",
    tests: "../test"
  },
  networks: {
    hardhat: {
      chainId: 1337 // Localhost for development
    },
    // You can add other networks here, e.g., for Goerli, Sepolia, etc.
    // goerli: {
    //   url: process.env.ALCHEMY_GOERLI_URL || "",
    //   accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },
  },
  // mocha: {
  //   timeout: 20000 // 20 seconds
  // }
};

export default config;
