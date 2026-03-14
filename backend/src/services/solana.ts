/**
 * services/solana.ts
 *
 * Real Solana NFT implementation using Metaplex Token Metadata program via UMI.
 *
 * Changes from original:
 *  - Replaced mock/placeholder with real Metaplex UMI calls
 *  - deploySolanaCollection creates a real Metaplex collection NFT on devnet
 *  - mintSolanaNFT mints a real NFT and links it to the collection
 *
 * Note: Metaplex UMI is the modern replacement for the older JS SDK (@metaplex-foundation/js).
 */

import {
  createUmi,
} from "@metaplex-foundation/umi-bundle-defaults";
import {
  createNft,
  mplTokenMetadata,
  fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import { NFTCollectionConfig, DeploymentResult, MintResult } from "../types";
import { ShelbyService } from "./shelby";

// ─── Helpers ──────────────────────────────────────────────────────────────

function getRpcUrl(): string {
  return process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
}

function getUmi() {
  const umi = createUmi(getRpcUrl()).use(mplTokenMetadata());

  // Load keypair from env (base64-encoded JSON byte array from `solana-keygen`)
  const privateKeyStr = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKeyStr) {
    throw new Error("SOLANA_PRIVATE_KEY not configured");
  }

  // Decode: solana-keygen produces a JSON byte array stored as base64
  const secretKeyBytes = Uint8Array.from(
    JSON.parse(Buffer.from(privateKeyStr, "base64").toString("utf8"))
  );

  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
  umi.use(keypairIdentity(keypair));

  return umi;
}

// ─── Deploy Collection ─────────────────────────────────────────────────────

/**
 * Creates a Metaplex collection NFT on Solana.
 * The "contractAddress" returned is the collection mint address.
 */
export async function deploySolanaCollection(
  config: NFTCollectionConfig
): Promise<DeploymentResult> {
  const umi = getUmi();

  // Generate a new keypair for the collection mint
  const collectionMint = generateSigner(umi);

  // The baseTokenURI should point to collection-level Shelby metadata
  // If not provided, build a placeholder
  const metadataUri =
    config.baseTokenURI ||
    `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${config.name.toLowerCase().replace(/\s/g, "-")}/collection.json`;

  const { signature } = await createNft(umi, {
    mint: collectionMint,
    name: config.name,
    symbol: config.symbol,
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(config.royaltyPercentage || 5, 2),
    isCollection: true,
  }).sendAndConfirm(umi);

  const txHash = Buffer.from(signature).toString("base64");

  return {
    contractAddress: collectionMint.publicKey.toString(),
    transactionHash: txHash,
    chain: "solana-devnet",
    deployedAt: new Date().toISOString(),
  };
}

// ─── Mint NFT ──────────────────────────────────────────────────────────────

/**
 * Mints an NFT on Solana using Metaplex and links it to a collection.
 *
 * contractAddress = the collection mint address from deploySolanaCollection
 * metadataUri     = shelby:// URI (converted to HTTP URL for on-chain metadata)
 */
export async function mintSolanaNFT({
  contractAddress,
  recipient,
  metadataUri,
}: {
  contractAddress: string;
  recipient: string;
  metadataUri: string;
}): Promise<MintResult> {
  const umi = getUmi();

  // Convert shelby:// URI to HTTP URL for on-chain storage (marketplaces need HTTP)
  const httpMetadataUri = metadataUri.startsWith("shelby://")
    ? ShelbyService.shelbyUriToHttpUrl(metadataUri)
    : metadataUri;

  // Generate a new mint keypair for this NFT
  const nftMint = generateSigner(umi);

  // Fetch collection to get its name/symbol
  const collectionAsset = await fetchDigitalAsset(
    umi,
    umiPublicKey(contractAddress)
  );

  const { signature } = await createNft(umi, {
    mint: nftMint,
    name: collectionAsset.metadata.name + " #" + Date.now(),
    uri: httpMetadataUri,
    sellerFeeBasisPoints: percentAmount(5, 2),
    collection: {
      verified: false,
      key: umiPublicKey(contractAddress),
    },
    tokenOwner: umiPublicKey(recipient),
  }).sendAndConfirm(umi);

  const txHash = Buffer.from(signature).toString("base64");

  return {
    tokenId: nftMint.publicKey.toString(),
    transactionHash: txHash,
    metadataUri: httpMetadataUri,
    recipient,
  };
}