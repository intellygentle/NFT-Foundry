// import { HardhatUserConfig } from "hardhat/config";
// import "@nomicfoundation/hardhat-toolbox";
// import "@nomicfoundation/hardhat-verify"; // replaces deprecated @nomiclabs/hardhat-etherscan
// import dotenv from "dotenv";

// dotenv.config({ path: "../../backend/.env" });

// const config: HardhatUserConfig = {
//   solidity: {
//     version: "0.8.20",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200,
//       },
//     },
//   },
//   networks: {
//     sepolia: {
//       url: process.env.EVM_RPC_URL || "https://sepolia.infura.io/v3/",
//       accounts: process.env.EVM_PRIVATE_KEY ? [process.env.EVM_PRIVATE_KEY] : [],
//       chainId: 11155111,
//     },
//     "polygon-mumbai": {
//       url: process.env.POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com",
//       accounts: process.env.EVM_PRIVATE_KEY ? [process.env.EVM_PRIVATE_KEY] : [],
//       chainId: 80001,
//     },
//     hardhat: {
//       chainId: 31337,
//     },
//   },
//   etherscan: {
//     apiKey: {
//       sepolia: process.env.ETHERSCAN_API_KEY || "",
//       polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
//     },
//   },
//   paths: {
//     sources: "./src",
//     tests: "./test",
//     cache: "./cache",
//     artifacts: "./artifacts",
//   },
// };

// export default config;


import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify"; // replaces deprecated @nomiclabs/hardhat-etherscan
import dotenv from "dotenv";

dotenv.config({ path: "../../backend/.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: process.env.EVM_RPC_URL || "https://sepolia.infura.io/v3/",
      accounts: process.env.EVM_PRIVATE_KEY ? [process.env.EVM_PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    "polygon-mumbai": {
      url: process.env.POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: process.env.EVM_PRIVATE_KEY ? [process.env.EVM_PRIVATE_KEY] : [],
      chainId: 80001,
    },
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;