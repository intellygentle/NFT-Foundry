export interface Chain {
  id: string;
  name: string;
  type: "evm" | "solana";
  network: "mainnet" | "testnet";
  chainId?: number;
  rpcUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  explorerUrl?: string;
}

export interface NFTCollectionConfig {
  name: string;
  symbol: string;
  description: string;
  maxSupply: number;
  mintPrice: string; // In native currency (ETH / SOL string)
  royaltyPercentage?: number;
  chain: string;
  baseTokenURI?: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string; // URL to image (HTTP or shelby://)
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  animation_url?: string;
}

export interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
}

export interface DeploymentResult {
  contractAddress: string;
  transactionHash: string;
  chain: string;
  deployedAt: string;
}

export interface MintResult {
  tokenId: string | number;
  transactionHash: string;
  metadataUri: string;
  recipient: string;
}