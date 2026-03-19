// /**
//  * services/evm.ts
//  *
//  * Changes from original:
//  *  - Added multi-chain support (Sepolia + Polygon Mumbai)
//  *  - Factory address now throws a clear error if not configured (was silently using 0x000...)
//  *  - getSigner() accepts an optional chainId for multi-chain deployments
//  *  - mintEVMNFT: shelbyCID is extracted from shelby:// URI correctly
//  */

// import { ethers } from "ethers";
// import { NFTCollectionConfig, DeploymentResult, MintResult } from "../types";

// // ─── ABIs ─────────────────────────────────────────────────────────────────

// const FACTORY_ABI = [
//   "function deployCollection(string name, string symbol, uint256 maxSupply, uint256 mintPrice, string baseTokenURI) external payable returns (address)",
//   "function getCreatorCollections(address creator) external view returns (tuple(address contractAddress, string name, string symbol, address creator, uint256 createdAt)[])",
//   "function deploymentFee() external view returns (uint256)",
//   "event CollectionDeployed(address indexed creator, address indexed collection, string name, string symbol)",
// ];

// const NFT_ABI = [
//   "function mint(address to, string memory shelbyCID) external payable",
//   "function ownerMint(address to, string memory shelbyCID) external",
//   "function mintPrice() external view returns (uint256)",
//   "function publicMintEnabled() external view returns (bool)",
//   "function totalSupply() external view returns (uint256)",
//   "event TokenMinted(uint256 indexed tokenId, address indexed to, string shelbyCID)",
// ];

// // ─── Chain config ──────────────────────────────────────────────────────────

// interface ChainConfig {
//   rpcUrl: string;
//   chainId: number;
//   factoryAddress: string;
//   name: string;
// }

// function getChainConfig(chain: string): ChainConfig {
//   switch (chain.toLowerCase()) {
//     case "polygon":
//     case "polygon-mumbai":
//       return {
//         rpcUrl: process.env.POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com",
//         chainId: 80001,
//         factoryAddress: process.env.POLYGON_FACTORY_ADDRESS || "",
//         name: "polygon-mumbai",
//       };

//     case "ethereum":
//     case "sepolia":
//     default:
//       return {
//         rpcUrl: process.env.EVM_RPC_URL || "",
//         chainId: 11155111,
//         factoryAddress: process.env.EVM_FACTORY_ADDRESS || "",
//         name: "sepolia",
//       };
//   }
// }

// function getProvider(chain: string): ethers.JsonRpcProvider {
//   const config = getChainConfig(chain);
//   if (!config.rpcUrl) {
//     throw new Error(`RPC URL not configured for chain: ${chain}`);
//   }
//   return new ethers.JsonRpcProvider(config.rpcUrl);
// }

// function getSigner(chain: string): ethers.Wallet {
//   const privateKey = process.env.EVM_PRIVATE_KEY;
//   if (!privateKey) {
//     throw new Error("EVM_PRIVATE_KEY not configured");
//   }
//   return new ethers.Wallet(privateKey, getProvider(chain));
// }

// // ─── Deploy collection ─────────────────────────────────────────────────────

// export async function deployEVMCollection(
//   config: NFTCollectionConfig
// ): Promise<DeploymentResult> {
//   const chain = config.chain || "sepolia";
//   const chainConfig = getChainConfig(chain);

//   if (
//     !chainConfig.factoryAddress ||
//     chainConfig.factoryAddress === "0x0000000000000000000000000000000000000000"
//   ) {
//     throw new Error(
//       `Factory contract not deployed on ${chain}. Run 'npm run deploy:${chain}' in contracts/evm first, then set ${chain.toUpperCase().replace("-", "_")}_FACTORY_ADDRESS in .env`
//     );
//   }

//   const signer = getSigner(chain);
//   const factory = new ethers.Contract(
//     chainConfig.factoryAddress,
//     FACTORY_ABI,
//     signer
//   );

//   // Get deployment fee from the factory
//   const deploymentFee: bigint = await factory.deploymentFee();

//   // Convert mint price from ETH string to wei
//   const mintPriceWei = ethers.parseEther(config.mintPrice || "0");

//   const tx = await factory.deployCollection(
//     config.name,
//     config.symbol,
//     config.maxSupply,
//     mintPriceWei,
//     config.baseTokenURI || "",
//     { value: deploymentFee }
//   );

//   const receipt = await tx.wait();
//   if (!receipt) throw new Error("Transaction failed — no receipt");

//   // Extract the deployed collection address from the CollectionDeployed event
//   let contractAddress = "";
//   for (const log of receipt.logs) {
//     try {
//       const parsed = factory.interface.parseLog(log);
//       if (parsed?.name === "CollectionDeployed") {
//         contractAddress = parsed.args.collection;
//         break;
//       }
//     } catch {
//       // Not our event
//     }
//   }

//   if (!contractAddress) {
//     throw new Error("CollectionDeployed event not found in transaction receipt");
//   }

//   return {
//     contractAddress,
//     transactionHash: tx.hash,
//     chain: chainConfig.name,
//     deployedAt: new Date().toISOString(),
//   };
// }

// // ─── Mint NFT ──────────────────────────────────────────────────────────────

// export async function mintEVMNFT({
//   contractAddress,
//   recipient,
//   metadataUri,
//   chain = "sepolia",
// }: {
//   contractAddress: string;
//   recipient: string;
//   metadataUri: string;
//   chain?: string;
// }): Promise<MintResult> {
//   const signer = getSigner(chain);
//   const nftContract = new ethers.Contract(contractAddress, NFT_ABI, signer);

//   // metadataUri is a shelby:// URI — the contract stores the CID portion
//   // Strip the "shelby://" prefix to get the path used by the contract
//   const shelbyCID = metadataUri.replace("shelby://", "");

//   const publicMintEnabled: boolean = await nftContract.publicMintEnabled();
//   const mintPrice: bigint = await nftContract.mintPrice();

//   let tx;
//   if (publicMintEnabled) {
//     tx = await nftContract.mint(recipient, shelbyCID, { value: mintPrice });
//   } else {
//     // Owner mint — caller must be the collection owner
//     tx = await nftContract.ownerMint(recipient, shelbyCID);
//   }

//   const receipt = await tx.wait();
//   if (!receipt) throw new Error("Mint transaction failed — no receipt");

//   // Extract token ID from TokenMinted event
//   let tokenId: string = "unknown";
//   for (const log of receipt.logs) {
//     try {
//       const parsed = nftContract.interface.parseLog(log);
//       if (parsed?.name === "TokenMinted") {
//         tokenId = parsed.args.tokenId.toString();
//         break;
//       }
//     } catch {
//       // Not our event
//     }
//   }

//   return {
//     tokenId,
//     transactionHash: tx.hash,
//     metadataUri,
//     recipient,
//   };
// }


/**
 * services/evm.ts
 *
 * Changes from original:
 *  - Added multi-chain support (Sepolia + Polygon Mumbai)
 *  - Factory address now throws a clear error if not configured (was silently using 0x000...)
 *  - getSigner() accepts an optional chainId for multi-chain deployments
 *  - mintEVMNFT: shelbyCID is extracted from shelby:// URI correctly
 */

import { ethers } from "ethers";
import { NFTCollectionConfig, DeploymentResult, MintResult } from "../types";

// ─── ABIs ─────────────────────────────────────────────────────────────────

const FACTORY_ABI = [
  "function deployCollection(string name, string symbol, uint256 maxSupply, uint256 mintPrice, string baseTokenURI) external payable returns (address)",
  "function getCreatorCollections(address creator) external view returns (tuple(address contractAddress, string name, string symbol, address creator, uint256 createdAt)[])",
  "function deploymentFee() external view returns (uint256)",
  "event CollectionDeployed(address indexed creator, address indexed collection, string name, string symbol)",
];

const NFT_ABI = [
  "function mint(address to, string memory shelbyCID) external payable",
  "function ownerMint(address to, string memory shelbyCID) external",
  "function mintPrice() external view returns (uint256)",
  "function publicMintEnabled() external view returns (bool)",
  "function totalSupply() external view returns (uint256)",
  "event TokenMinted(uint256 indexed tokenId, address indexed to, string shelbyCID)",
];

// ─── Chain config ──────────────────────────────────────────────────────────

interface ChainConfig {
  rpcUrl: string;
  chainId: number;
  factoryAddress: string;
  name: string;
}

function getChainConfig(chain: string): ChainConfig {
  switch (chain.toLowerCase()) {
    case "polygon":
    case "polygon-mumbai":
      return {
        rpcUrl: process.env.POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com",
        chainId: 80001,
        factoryAddress: process.env.POLYGON_FACTORY_ADDRESS || "",
        name: "polygon-mumbai",
      };

    case "ethereum":
    case "sepolia":
    default:
      return {
        rpcUrl: process.env.EVM_RPC_URL || "",
        chainId: 11155111,
        factoryAddress: process.env.EVM_FACTORY_ADDRESS || "",
        name: "sepolia",
      };
  }
}

function getProvider(chain: string): ethers.JsonRpcProvider {
  const config = getChainConfig(chain);
  if (!config.rpcUrl) {
    throw new Error(`RPC URL not configured for chain: ${chain}`);
  }
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

function getSigner(chain: string): ethers.Wallet {
  const privateKey = process.env.EVM_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("EVM_PRIVATE_KEY not configured");
  }
  return new ethers.Wallet(privateKey, getProvider(chain));
}

// ─── Deploy collection ─────────────────────────────────────────────────────

export async function deployEVMCollection(
  config: NFTCollectionConfig
): Promise<DeploymentResult> {
  const chain = config.chain || "sepolia";
  const chainConfig = getChainConfig(chain);

  if (
    !chainConfig.factoryAddress ||
    chainConfig.factoryAddress === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(
      `Factory contract not deployed on ${chain}. Run 'npm run deploy:${chain}' in contracts/evm first, then set ${chain.toUpperCase().replace("-", "_")}_FACTORY_ADDRESS in .env`
    );
  }

  const signer = getSigner(chain);
  const factory = new ethers.Contract(
    chainConfig.factoryAddress,
    FACTORY_ABI,
    signer
  );

  // Get deployment fee from the factory
  const deploymentFee: bigint = await factory.deploymentFee();

  // Convert mint price from ETH string to wei
  const mintPriceWei = ethers.parseEther(config.mintPrice || "0");

  const tx = await factory.deployCollection(
    config.name,
    config.symbol,
    config.maxSupply,
    mintPriceWei,
    config.baseTokenURI || "",
    { value: deploymentFee }
  );

  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction failed — no receipt");

  // Extract the deployed collection address from the CollectionDeployed event
  let contractAddress = "";
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === "CollectionDeployed") {
        contractAddress = parsed.args.collection;
        break;
      }
    } catch {
      // Not our event
    }
  }

  if (!contractAddress) {
    throw new Error("CollectionDeployed event not found in transaction receipt");
  }

  return {
    contractAddress,
    transactionHash: tx.hash,
    chain: chainConfig.name,
    deployedAt: new Date().toISOString(),
  };
}

// ─── Mint NFT ──────────────────────────────────────────────────────────────

export async function mintEVMNFT({
  contractAddress,
  recipient,
  metadataUri,
  chain = "sepolia",
}: {
  contractAddress: string;
  recipient: string;
  metadataUri: string;
  chain?: string;
}): Promise<MintResult> {
  const signer = getSigner(chain);
  const nftContract = new ethers.Contract(contractAddress, NFT_ABI, signer);

  // metadataUri is either "shelby://account/path" or plain "account/path"
  // The contract stores the path portion and prepends the gateway URL in tokenURI()
  const shelbyCID = metadataUri.startsWith("shelby://")
    ? metadataUri.slice(9)
    : metadataUri;

  const publicMintEnabled: boolean = await nftContract.publicMintEnabled();
  const mintPrice: bigint = await nftContract.mintPrice();

  let tx;
  if (publicMintEnabled) {
    tx = await nftContract.mint(recipient, shelbyCID, { value: mintPrice });
  } else {
    // Owner mint — caller must be the collection owner
    tx = await nftContract.ownerMint(recipient, shelbyCID);
  }

  const receipt = await tx.wait();
  if (!receipt) throw new Error("Mint transaction failed — no receipt");

  // Extract token ID from TokenMinted event
  let tokenId: string = "unknown";
  for (const log of receipt.logs) {
    try {
      const parsed = nftContract.interface.parseLog(log);
      if (parsed?.name === "TokenMinted") {
        tokenId = parsed.args.tokenId.toString();
        break;
      }
    } catch {
      // Not our event
    }
  }

  return {
    tokenId,
    transactionHash: tx.hash,
    metadataUri,
    recipient,
  };
}