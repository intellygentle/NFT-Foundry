/**
 * lib/shelbyBrowser.ts
 *
 * Browser-side Shelby upload helper.
 *
 * We call our backend API which handles the actual Shelby SDK interaction.
 * The user's Aptos wallet address is passed as the collectionId namespace
 * so blobs are logically associated with their account in the blob names.
 *
 * The Aptos wallet is connected in the UI to verify ownership and in the
 * future can be used for direct signing once Shelby publishes a proper
 * browser-compatible build.
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface BrowserUploadResult {
  metadataShelbyUri: string;
  imageShelbyUri: string;
  metadataHttpUrl: string;
  imageHttpUrl: string;
  collectionId: string;
}

/**
 * Upload image + metadata for one NFT via the backend API.
 * Uses the user's Aptos address as the collection namespace.
 */
export async function uploadNFTToShelby(
  imageFile: File,
  metadata: {
    name: string;
    description: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
    external_url?: string;
  },
  collectionId: string,
  index: number,
  _signer?: any,      // reserved for future direct signing
  _apiKey?: string    // reserved for future direct signing
): Promise<{ metadataShelbyUri: string; imageShelbyUri: string }> {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('name', metadata.name);
  formData.append('description', metadata.description);
  formData.append('collectionId', collectionId);
  formData.append('index', String(index));

  if (metadata.attributes && metadata.attributes.length > 0) {
    formData.append('attributes', JSON.stringify(metadata.attributes));
  }
  if (metadata.external_url) {
    formData.append('external_url', metadata.external_url);
  }

  const { data } = await axios.post(
    `${API_URL}/api/nft/upload-metadata`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  return {
    metadataShelbyUri: data.metadataShelbyUri,
    imageShelbyUri: data.imageShelbyUri,
  };
}

// ── URI helpers ───────────────────────────────────────────────────────────

const SHELBYNET_RPC_BASE = 'https://api.shelbynet.shelby.xyz';

export function shelbyUriToHttpUrl(shelbyUri: string): string {
  if (!shelbyUri?.startsWith('shelby://')) return shelbyUri;
  const stripped = shelbyUri.replace('shelby://', '');
  const slashIdx = stripped.indexOf('/');
  if (slashIdx === -1) return shelbyUri;
  const accountAddress = stripped.slice(0, slashIdx);
  const blobName = stripped.slice(slashIdx + 1);
  return `${SHELBYNET_RPC_BASE}/shelby/v1/blobs/${accountAddress}/${blobName}`;
}