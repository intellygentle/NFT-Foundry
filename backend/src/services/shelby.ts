/**
 * shelby.ts — Shelby Protocol storage service
 *
 * KEY FIX: @shelby-protocol/sdk@0.2.4 exports "./node" as ESM-only
 * (no "require" field in exports map, only "import").
 * CommonJS require() cannot load ESM-only packages.
 * Solution: use Node's dynamic import() which works from CommonJS files
 * and correctly loads ESM modules.
 *
 * We also do NOT import @aptos-labs/ts-sdk directly — it's bundled
 * inside @shelby-protocol/sdk/node already. We pull Account/Ed25519Account
 * from the same dynamic import so versions are guaranteed to match.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ShelbyUploadResult {
  accountAddress: string;
  blobName: string;
  publicUrl: string;
  shelbyUri: string;
  transactionHash: string;
}

export interface MetadataFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size?: number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  external_url?: string;
  animation_url?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const SHELBYNET_RPC_BASE = "https://api.shelbynet.shelby.xyz";

// ─── Lazy ESM loader ────────────────────────────────────────────────────────

// Cache the loaded module so we only call import() once
let _shelbyModule: any = null;

async function getShelbyModule(): Promise<any> {
  if (_shelbyModule) return _shelbyModule;

  // Resolve path to the Shelby SDK ESM build.
  // Works whether running from src/ (ts-node) or dist/ (compiled):
  //   ts-node:  __dirname = .../backend/src/services/
  //   compiled: __dirname = .../backend/dist/services/
  // In both cases, node_modules is two levels up from services/
  const path = require("path");
  const distPath = path.resolve(
    __dirname,
    "../../node_modules/@shelby-protocol/sdk/dist/node/index.mjs"
  );

  // Fallback: try one level up (in case of flattened dist structure)
  const fallbackPath = path.resolve(
    __dirname,
    "../node_modules/@shelby-protocol/sdk/dist/node/index.mjs"
  );

  const fs = require("fs");
  const targetPath = fs.existsSync(distPath) ? distPath : fallbackPath;

  try {
    _shelbyModule = await import(targetPath);
    console.log("  [Shelby] loaded from:", targetPath);
  } catch (err) {
    throw new Error(
      `Failed to load @shelby-protocol/sdk from ${targetPath}: ${err}`
    );
  }

  return _shelbyModule;
}

// ─── ShelbyService ──────────────────────────────────────────────────────────

export class ShelbyService {
  // These are set during initialize() — not in constructor
  private client: any = null;
  private account: any = null;
  private _accountAddress: string = "";
  private _initialized = false;

  // ── Initialize (call once before using) ─────────────────────────────────

  async initialize(): Promise<void> {
    if (this._initialized) return;

    const privateKeyStr = process.env.SHELBY_PRIVATE_KEY;
    const apiKey        = process.env.SHELBY_API_KEY;
    const networkStr    = (process.env.SHELBY_NETWORK || "shelbynet").toLowerCase();

    if (!privateKeyStr) {
      throw new Error(
        "SHELBY_PRIVATE_KEY not set. Run the key generation command from the .env setup guide."
      );
    }

    // Load the Shelby SDK (ESM, loaded by direct path)
    const shelby = await getShelbyModule();
    const mod = shelby.default ?? shelby;

    const { ShelbyNodeClient } = mod;
    if (typeof ShelbyNodeClient !== "function") {
      throw new Error(
        `ShelbyNodeClient not found. Available: ${Object.keys(mod).join(", ")}`
      );
    }

    // Load @aptos-labs/ts-sdk directly — NOT from Shelby re-exports
    // (the Shelby SDK bundles its own copy internally but doesn't re-export
    // Ed25519Account / Ed25519PrivateKey / Network to consumers)
    const aptos = require("@aptos-labs/ts-sdk");
    const { Ed25519PrivateKey, Ed25519Account, Network } = aptos;

    if (!Ed25519PrivateKey || !Ed25519Account) {
      throw new Error(
        "@aptos-labs/ts-sdk not installed. Run: npm install @aptos-labs/ts-sdk@5"
      );
    }

    // Resolve Network enum value
    let network: unknown = networkStr;
    if (Network) {
      if (networkStr === "mainnet" && Network.MAINNET) {
        network = Network.MAINNET;
      } else if (Network.SHELBYNET) {
        network = Network.SHELBYNET;
      } else if (Network.TESTNET) {
        network = Network.TESTNET;
      }
    }

    // Build Aptos account from private key
    this.account = new Ed25519Account({
      privateKey: new Ed25519PrivateKey(privateKeyStr),
    });
    this._accountAddress = this.account.accountAddress.toString();

    // Build Shelby client
    const config: Record<string, unknown> = { network };
    if (apiKey) config.apiKey = apiKey;

    this.client = new ShelbyNodeClient(config);
    this._initialized = true;

    console.log(`✅ ShelbyService ready | account: ${this._accountAddress} | network: ${networkStr}`);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this._initialized) await this.initialize();
  }

  // ── URL helpers ──────────────────────────────────────────────────────────

  private publicUrl(blobName: string): string {
    return `${SHELBYNET_RPC_BASE}/shelby/v1/blobs/${this._accountAddress}/${blobName}`;
  }

  private shelbyUri(blobName: string): string {
    return `shelby://${this._accountAddress}/${blobName}`;
  }

  // ── Core upload ──────────────────────────────────────────────────────────

  async uploadBlob(blobData: Buffer, blobName: string, ttlDays = 30): Promise<ShelbyUploadResult> {
    await this.ensureInitialized();
    const expirationMicros = (Date.now() + ttlDays * 24 * 60 * 60 * 1000) * 1000;

    const { transaction } = await this.client.upload({
      signer: this.account,
      blobData,
      blobName,
      expirationMicros,
    });

    console.log(`📤 Shelby upload: ${blobName} | tx: ${transaction.hash}`);
    return {
      accountAddress: this._accountAddress,
      blobName,
      publicUrl: this.publicUrl(blobName),
      shelbyUri: this.shelbyUri(blobName),
      transactionHash: transaction.hash,
    };
  }

  // ── Image upload ─────────────────────────────────────────────────────────

  async uploadImage(file: MetadataFile, collectionId: string, index: number): Promise<ShelbyUploadResult> {
    const ext = file.filename.split(".").pop() || "bin";
    return this.uploadBlob(file.buffer, `nfts/${collectionId}/images/${index}.${ext}`);
  }

  // ── Metadata upload ───────────────────────────────────────────────────────

  async uploadMetadata(metadata: NFTMetadata, collectionId: string, index: number): Promise<ShelbyUploadResult> {
    const blobData = Buffer.from(JSON.stringify(metadata, null, 2));
    return this.uploadBlob(blobData, `nfts/${collectionId}/metadata/${index}.json`);
  }

  // ── Combined image + metadata ─────────────────────────────────────────────

  async uploadNFTData(
    imageFile: MetadataFile,
    metadata: Omit<NFTMetadata, "image">,
    collectionId: string,
    index: number
  ): Promise<{ metadataShelbyUri: string; imageShelbyUri: string }> {
    const imageResult = await this.uploadImage(imageFile, collectionId, index);
    const fullMetadata: NFTMetadata = { ...metadata, image: imageResult.publicUrl };
    const metaResult = await this.uploadMetadata(fullMetadata, collectionId, index);
    return {
      metadataShelbyUri: metaResult.shelbyUri,
      imageShelbyUri:    imageResult.shelbyUri,
    };
  }

  // ── Batch collection upload ───────────────────────────────────────────────

  async uploadCollection(
    imageFiles: MetadataFile[],
    metadataArray: Array<Omit<NFTMetadata, "image">>,
    collectionId: string
  ): Promise<string[]> {
    if (imageFiles.length !== metadataArray.length) {
      throw new Error("imageFiles and metadataArray must have the same length");
    }
    const uris: string[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      console.log(`📦 Uploading NFT ${i + 1}/${imageFiles.length}`);
      const { metadataShelbyUri } = await this.uploadNFTData(
        imageFiles[i], metadataArray[i], collectionId, i + 1
      );
      uris.push(metadataShelbyUri);
    }
    console.log(`✅ Collection upload complete: ${uris.length} NFTs`);
    return uris;
  }

  // ── Download ──────────────────────────────────────────────────────────────

  async download(blobName: string): Promise<Buffer> {
    await this.ensureInitialized();
    const blob = await this.client.download({
      account: this._accountAddress,
      blobName,
    });
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      blob.stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      blob.stream.on("end", () => resolve(Buffer.concat(chunks)));
      blob.stream.on("error", reject);
    });
  }

  // ── Static URI helpers ────────────────────────────────────────────────────

  static parseShelbyUri(uri: string): { accountAddress: string; blobName: string } {
    const stripped = uri.replace("shelby://", "");
    const slashIdx = stripped.indexOf("/");
    if (slashIdx === -1) throw new Error(`Invalid shelby URI: ${uri}`);
    return {
      accountAddress: stripped.slice(0, slashIdx),
      blobName: stripped.slice(slashIdx + 1),
    };
  }

  static shelbyUriToHttpUrl(uri: string): string {
    const { accountAddress, blobName } = ShelbyService.parseShelbyUri(uri);
    return `${SHELBYNET_RPC_BASE}/shelby/v1/blobs/${accountAddress}/${blobName}`;
  }

  getAccountAddress(): string {
    return this._accountAddress || "(not initialized yet)";
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: ShelbyService | null = null;

export function getShelbyService(): ShelbyService {
  if (!_instance) {
    _instance = new ShelbyService();
  }
  return _instance;
}

export default getShelbyService;





// /**
//  * shelby.ts — Shelby Protocol storage service
//  *
//  * KEY FIX: @shelby-protocol/sdk@0.2.4 exports "./node" as ESM-only
//  * (no "require" field in exports map, only "import").
//  * CommonJS require() cannot load ESM-only packages.
//  * Solution: use Node's dynamic import() which works from CommonJS files
//  * and correctly loads ESM modules.
//  *
//  * We also do NOT import @aptos-labs/ts-sdk directly — it's bundled
//  * inside @shelby-protocol/sdk/node already. We pull Account/Ed25519Account
//  * from the same dynamic import so versions are guaranteed to match.
//  */

// // ─── Types ─────────────────────────────────────────────────────────────────

// export interface ShelbyUploadResult {
//   accountAddress: string;
//   blobName: string;
//   publicUrl: string;
//   shelbyUri: string;
//   transactionHash: string;
// }

// export interface MetadataFile {
//   buffer: Buffer;
//   filename: string;
//   mimetype: string;
//   size?: number;
// }

// export interface NFTMetadata {
//   name: string;
//   description: string;
//   image: string;
//   attributes?: Array<{ trait_type: string; value: string | number }>;
//   external_url?: string;
//   animation_url?: string;
// }

// // ─── Constants ─────────────────────────────────────────────────────────────

// const SHELBYNET_RPC_BASE = "https://api.shelbynet.shelby.xyz";

// // ─── Lazy ESM loader ────────────────────────────────────────────────────────

// // Cache the loaded module so we only call import() once
// let _shelbyModule: any = null;

// async function getShelbyModule(): Promise<any> {
//   if (_shelbyModule) return _shelbyModule;

//   // The @shelby-protocol/sdk@0.2.4 exports map only has "import" (ESM),
//   // no "require" (CJS). Node 25 strictly enforces the exports map so even
//   // dynamic import() fails when using the package name + subpath.
//   //
//   // Solution: import the dist file DIRECTLY by filesystem path, bypassing
//   // the exports map entirely. This always works regardless of Node version.
//   const path = require("path");
//   const distPath = path.resolve(
//     __dirname,
//     "../../node_modules/@shelby-protocol/sdk/dist/node/index.mjs"
//   );

//   try {
//     _shelbyModule = await import(distPath);
//     console.log("  [Shelby] loaded via direct path:", distPath);
//   } catch (err) {
//     throw new Error(
//       `Failed to load @shelby-protocol/sdk from ${distPath}: ${err}`
//     );
//   }

//   return _shelbyModule;
// }

// // ─── ShelbyService ──────────────────────────────────────────────────────────

// export class ShelbyService {
//   // These are set during initialize() — not in constructor
//   private client: any = null;
//   private account: any = null;
//   private _accountAddress: string = "";
//   private _initialized = false;

//   // ── Initialize (call once before using) ─────────────────────────────────

//   async initialize(): Promise<void> {
//     if (this._initialized) return;

//     const privateKeyStr = process.env.SHELBY_PRIVATE_KEY;
//     const apiKey        = process.env.SHELBY_API_KEY;
//     const networkStr    = (process.env.SHELBY_NETWORK || "shelbynet").toLowerCase();

//     if (!privateKeyStr) {
//       throw new Error(
//         "SHELBY_PRIVATE_KEY not set. Run the key generation command from the .env setup guide."
//       );
//     }

//     // Load the Shelby SDK (ESM, loaded by direct path)
//     const shelby = await getShelbyModule();
//     const mod = shelby.default ?? shelby;

//     const { ShelbyNodeClient } = mod;
//     if (typeof ShelbyNodeClient !== "function") {
//       throw new Error(
//         `ShelbyNodeClient not found. Available: ${Object.keys(mod).join(", ")}`
//       );
//     }

//     // Load @aptos-labs/ts-sdk directly — NOT from Shelby re-exports
//     // (the Shelby SDK bundles its own copy internally but doesn't re-export
//     // Ed25519Account / Ed25519PrivateKey / Network to consumers)
//     const aptos = require("@aptos-labs/ts-sdk");
//     const { Ed25519PrivateKey, Ed25519Account, Network } = aptos;

//     if (!Ed25519PrivateKey || !Ed25519Account) {
//       throw new Error(
//         "@aptos-labs/ts-sdk not installed. Run: npm install @aptos-labs/ts-sdk@5"
//       );
//     }

//     // Resolve Network enum value
//     let network: unknown = networkStr;
//     if (Network) {
//       if (networkStr === "mainnet" && Network.MAINNET) {
//         network = Network.MAINNET;
//       } else if (Network.SHELBYNET) {
//         network = Network.SHELBYNET;
//       } else if (Network.TESTNET) {
//         network = Network.TESTNET;
//       }
//     }

//     // Build Aptos account from private key
//     this.account = new Ed25519Account({
//       privateKey: new Ed25519PrivateKey(privateKeyStr),
//     });
//     this._accountAddress = this.account.accountAddress.toString();

//     // Build Shelby client
//     const config: Record<string, unknown> = { network };
//     if (apiKey) config.apiKey = apiKey;

//     this.client = new ShelbyNodeClient(config);
//     this._initialized = true;

//     console.log(`✅ ShelbyService ready | account: ${this._accountAddress} | network: ${networkStr}`);
//   }

//   private async ensureInitialized(): Promise<void> {
//     if (!this._initialized) await this.initialize();
//   }

//   // ── URL helpers ──────────────────────────────────────────────────────────

//   private publicUrl(blobName: string): string {
//     return `${SHELBYNET_RPC_BASE}/shelby/v1/blobs/${this._accountAddress}/${blobName}`;
//   }

//   private shelbyUri(blobName: string): string {
//     return `shelby://${this._accountAddress}/${blobName}`;
//   }

//   // ── Core upload ──────────────────────────────────────────────────────────

//   async uploadBlob(blobData: Buffer, blobName: string, ttlDays = 30): Promise<ShelbyUploadResult> {
//     await this.ensureInitialized();
//     const expirationMicros = (Date.now() + ttlDays * 24 * 60 * 60 * 1000) * 1000;

//     const { transaction } = await this.client.upload({
//       signer: this.account,
//       blobData,
//       blobName,
//       expirationMicros,
//     });

//     console.log(`📤 Shelby upload: ${blobName} | tx: ${transaction.hash}`);
//     return {
//       accountAddress: this._accountAddress,
//       blobName,
//       publicUrl: this.publicUrl(blobName),
//       shelbyUri: this.shelbyUri(blobName),
//       transactionHash: transaction.hash,
//     };
//   }

//   // ── Image upload ─────────────────────────────────────────────────────────

//   async uploadImage(file: MetadataFile, collectionId: string, index: number): Promise<ShelbyUploadResult> {
//     const ext = file.filename.split(".").pop() || "bin";
//     return this.uploadBlob(file.buffer, `nfts/${collectionId}/images/${index}.${ext}`);
//   }

//   // ── Metadata upload ───────────────────────────────────────────────────────

//   async uploadMetadata(metadata: NFTMetadata, collectionId: string, index: number): Promise<ShelbyUploadResult> {
//     const blobData = Buffer.from(JSON.stringify(metadata, null, 2));
//     return this.uploadBlob(blobData, `nfts/${collectionId}/metadata/${index}.json`);
//   }

//   // ── Combined image + metadata ─────────────────────────────────────────────

//   async uploadNFTData(
//     imageFile: MetadataFile,
//     metadata: Omit<NFTMetadata, "image">,
//     collectionId: string,
//     index: number
//   ): Promise<{ metadataShelbyUri: string; imageShelbyUri: string }> {
//     const imageResult = await this.uploadImage(imageFile, collectionId, index);
//     const fullMetadata: NFTMetadata = { ...metadata, image: imageResult.publicUrl };
//     const metaResult = await this.uploadMetadata(fullMetadata, collectionId, index);
//     return {
//       metadataShelbyUri: metaResult.shelbyUri,
//       imageShelbyUri:    imageResult.shelbyUri,
//     };
//   }

//   // ── Batch collection upload ───────────────────────────────────────────────

//   async uploadCollection(
//     imageFiles: MetadataFile[],
//     metadataArray: Array<Omit<NFTMetadata, "image">>,
//     collectionId: string
//   ): Promise<string[]> {
//     if (imageFiles.length !== metadataArray.length) {
//       throw new Error("imageFiles and metadataArray must have the same length");
//     }
//     const uris: string[] = [];
//     for (let i = 0; i < imageFiles.length; i++) {
//       console.log(`📦 Uploading NFT ${i + 1}/${imageFiles.length}`);
//       const { metadataShelbyUri } = await this.uploadNFTData(
//         imageFiles[i], metadataArray[i], collectionId, i + 1
//       );
//       uris.push(metadataShelbyUri);
//     }
//     console.log(`✅ Collection upload complete: ${uris.length} NFTs`);
//     return uris;
//   }

//   // ── Download ──────────────────────────────────────────────────────────────

//   async download(blobName: string): Promise<Buffer> {
//     await this.ensureInitialized();
//     const blob = await this.client.download({
//       account: this._accountAddress,
//       blobName,
//     });
//     return new Promise((resolve, reject) => {
//       const chunks: Uint8Array[] = [];
//       blob.stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
//       blob.stream.on("end", () => resolve(Buffer.concat(chunks)));
//       blob.stream.on("error", reject);
//     });
//   }

//   // ── Static URI helpers ────────────────────────────────────────────────────

//   static parseShelbyUri(uri: string): { accountAddress: string; blobName: string } {
//     const stripped = uri.replace("shelby://", "");
//     const slashIdx = stripped.indexOf("/");
//     if (slashIdx === -1) throw new Error(`Invalid shelby URI: ${uri}`);
//     return {
//       accountAddress: stripped.slice(0, slashIdx),
//       blobName: stripped.slice(slashIdx + 1),
//     };
//   }

//   static shelbyUriToHttpUrl(uri: string): string {
//     const { accountAddress, blobName } = ShelbyService.parseShelbyUri(uri);
//     return `${SHELBYNET_RPC_BASE}/shelby/v1/blobs/${accountAddress}/${blobName}`;
//   }

//   getAccountAddress(): string {
//     return this._accountAddress || "(not initialized yet)";
//   }
// }

// // ─── Singleton ──────────────────────────────────────────────────────────────

// let _instance: ShelbyService | null = null;

// export function getShelbyService(): ShelbyService {
//   if (!_instance) {
//     _instance = new ShelbyService();
//   }
//   return _instance;
// }

// export default getShelbyService;