/**
 * lib/api.ts
 *
 * Typed API client for the NFT Foundry backend.
 * All calls go to NEXT_PUBLIC_API_URL (default: http://localhost:3001).
 */

import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000, // Shelby uploads can take a while
});

// ── Types ─────────────────────────────────────────────────────────────────

export interface ChainInfo {
  id: string;
  name: string;
  type: 'evm' | 'solana';
  network: 'mainnet' | 'testnet';
  chainId?: number;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  explorerUrl?: string;
}

export interface UploadMetadataResult {
  success: boolean;
  collectionId: string;
  index: number;
  metadataShelbyUri: string;
  imageShelbyUri: string;
  metadataHttpUrl: string;
  imageHttpUrl: string;
}

export interface UploadCollectionResult {
  success: boolean;
  collectionId: string;
  count: number;
  metadataShelbyUris: string[];
}

export interface DeployResult {
  success: boolean;
  deployment: {
    contractAddress: string;
    transactionHash: string;
    chain: string;
    deployedAt: string;
  };
}

export interface MintResult {
  success: boolean;
  mint: {
    tokenId: string | number;
    transactionHash: string;
    metadataUri: string;
    recipient: string;
  };
}

export interface ShelbyStatus {
  status: 'connected' | 'error';
  accountAddress?: string;
  network?: string;
  error?: string;
}

// ── API methods ────────────────────────────────────────────────────────────

export const nftApi = {
  /** Get supported chains */
  getChains: async (): Promise<ChainInfo[]> => {
    const { data } = await api.get('/api/nft/chains');
    return data.chains;
  },

  /**
   * Upload a single NFT image + metadata to Shelby.
   * Pass a FormData with: image (File), name, description, collectionId, index, [attributes JSON]
   */
  uploadMetadata: async (formData: FormData): Promise<UploadMetadataResult> => {
    const { data } = await api.post('/api/nft/upload-metadata', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /**
   * Upload multiple NFTs (batch) to Shelby.
   * FormData: images[] (File[]), metadata (JSON string array), collectionId
   */
  uploadCollection: async (formData: FormData): Promise<UploadCollectionResult> => {
    const { data } = await api.post('/api/nft/upload-collection', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Deploy a new NFT collection on a chain */
  deploy: async (config: {
    name: string;
    symbol: string;
    description: string;
    maxSupply: number;
    mintPrice: string;
    royaltyPercentage?: number;
    chain: string;
    baseTokenURI?: string;
  }): Promise<DeployResult> => {
    const { data } = await api.post('/api/nft/deploy', config);
    return data;
  },

  /** Mint an NFT into an existing collection */
  mint: async (params: {
    contractAddress: string;
    recipient: string;
    metadataUri: string;
    chain: string;
  }): Promise<MintResult> => {
    const { data } = await api.post('/api/nft/mint', params);
    return data;
  },

  /** Read on-chain collection info (name, supply, price, etc.) */
  getCollectionInfo: async (
    chain: string,
    address: string
  ): Promise<{
    contractAddress: string;
    chain: string;
    name: string;
    symbol: string;
    totalSupply: string;
    maxSupply: string;
    mintPrice: string;
    mintPriceRaw: string;
    publicMintEnabled: boolean;
    baseTokenURI: string;
  }> => {
    const { data } = await api.get(`/api/nft/collection/${chain}/${address}`);
    return data;
  },
};

export const shelbyApi = {
  getStatus: async (): Promise<ShelbyStatus> => {
    const { data } = await api.get('/api/shelby/status');
    return data;
  },
  toHttpUrl: async (shelbyUri: string): Promise<string> => {
    const { data } = await api.get('/api/shelby/url', { params: { uri: shelbyUri } });
    return data.httpUrl;
  },
};

export const walletApi = {
  verify: async (params: {
    address: string;
    signature: string;
    message: string;
    chain: string;
  }): Promise<{ verified: boolean; address: string }> => {
    const { data } = await api.post('/api/wallet/verify', params);
    return data;
  },
};

export default api;