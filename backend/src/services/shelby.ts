/**
 * shelby.ts — Shelby Protocol storage service
 *
 * Uses @shelby-protocol/sdk@0.2.4 loaded via dynamic import() since
 * the package only exports ESM (no CommonJS require support).
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

let _shelbyModule: any = null;

async function getShelbyModule(): Promise<any> {
  if (_shelbyModule) return _shelbyModule;

  const path = require("path");
  const fs = require("fs");

  const candidates = [
    path.resolve(__dirname, "../../node_modules/@shelby-protocol/sdk/dist/node/index.mjs"),
    path.resolve(__dirname, "../node_modules/@shelby-protocol/sdk/dist/node/index.mjs"),
    path.resolve(process.cwd(), "node_modules/@shelby-protocol/sdk/dist/node/index.mjs"),
  ];

  const targetPath = candidates.find(p => fs.existsSync(p));
  if (!targetPath) {
    throw new Error(`@shelby-protocol/sdk not found. Tried:\n${candidates.join('\n')}`);
  }

  _shelbyModule = await import(targetPath);
  console.log("  [Shelby] SDK loaded from:", targetPath);
  return _shelbyModule;
}

// ─── ShelbyService ──────────────────────────────────────────────────────────

export class ShelbyService {
  private client: any = null;
  private account: any = null;
  private _accountAddress: string = "";
  private _initialized = false;

  async initialize(): Promise<void> {
    if (this._initialized) return;

    const privateKeyStr = process.env.SHELBY_PRIVATE_KEY;
    const apiKey        = process.env.SHELBY_API_KEY;

    if (!privateKeyStr) {
      throw new Error("SHELBY_PRIVATE_KEY not set.");
    }

    // Load Shelby SDK
    const shelby = await getShelbyModule();
    const mod = shelby.default ?? shelby;

    const { ShelbyNodeClient } = mod;
    if (typeof ShelbyNodeClient !== "function") {
      throw new Error(`ShelbyNodeClient not found. Exports: ${Object.keys(mod).join(", ")}`);
    }

    // Load Aptos SDK
    const aptos = require("@aptos-labs/ts-sdk");
    const { Ed25519PrivateKey, Ed25519Account, Account, Network } = aptos;

    if (!Ed25519PrivateKey) {
      throw new Error("@aptos-labs/ts-sdk not installed.");
    }

    // Build account
    const privateKey = new Ed25519PrivateKey(privateKeyStr);
    if (Account && typeof Account.fromPrivateKey === "function") {
      this.account = await Account.fromPrivateKey({ privateKey });
    } else {
      this.account = new Ed25519Account({ privateKey });
    }
    this._accountAddress = this.account.accountAddress.toString();

    console.log(`  [Shelby] account: ${this._accountAddress}`);
    console.log(`  [Shelby] account keys: ${Object.keys(this.account).join(", ")}`);

    // Build client config
    // IMPORTANT: Keep this minimal — complex configs cause upload() to return undefined
    // The simple { network } config is what produced actual blockchain transactions previously
    const clientConfig: any = {};
    if (apiKey) clientConfig.apiKey = apiKey;

    // Try network values in order of preference
    const shelbynet = (Network as any)?.SHELBYNET;
    const testnet   = Network?.TESTNET;

    if (shelbynet !== undefined) {
      clientConfig.network = shelbynet;
      console.log("  [Shelby] using Network.SHELBYNET");
    } else if (testnet !== undefined) {
      clientConfig.network = testnet;
      console.log("  [Shelby] using Network.TESTNET (fallback)");
    } else {
      console.log("  [Shelby] no network set — using SDK defaults");
    }

    console.log("  [Shelby] clientConfig keys:", Object.keys(clientConfig).join(", "));

    this.client = new ShelbyNodeClient(clientConfig);

    // Log what methods are available on the client
    const clientMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.client))
      .filter(m => typeof this.client[m] === "function");
    console.log(`  [Shelby] client methods: ${clientMethods.join(", ")}`);

    this._initialized = true;
    console.log(`✅ ShelbyService ready | account: ${this._accountAddress}`);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this._initialized) await this.initialize();
  }

  private publicUrl(blobName: string): string {
    return `${SHELBYNET_RPC_BASE}/shelby/v1/blobs/${this._accountAddress}/${blobName}`;
  }

  private shelbyUri(blobName: string): string {
    return `shelby://${this._accountAddress}/${blobName}`;
  }

  async uploadBlob(blobData: Buffer, blobName: string, ttlDays = 30): Promise<ShelbyUploadResult> {
    await this.ensureInitialized();
    const expirationMicros = (Date.now() + ttlDays * 24 * 60 * 60 * 1000) * 1000;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`  [Shelby] upload attempt ${attempt}/3: ${blobName}`);

        // Pass every possible param name the SDK might expect
        const uploadParams: any = {
          blobData,
          blobName,
          expirationMicros,
          signer:    this.account,
          account:   this.account,
          sender:    this.account,
          publisher: this.account,
        };

        const result = await this.client.upload(uploadParams);

        // Log the raw result so we can see its shape
        console.log(`  [Shelby] upload raw result type: ${typeof result}`);
        console.log(`  [Shelby] upload raw result keys: ${result ? Object.keys(result).join(", ") : "null/undefined"}`);

        if (!result) {
          throw new Error("upload() returned undefined — check SDK version compatibility");
        }

        // Handle different return shapes
        const txHash =
          result.transaction?.hash ||        // { transaction: { hash } }
          result.transactionHash ||          // { transactionHash }
          result.hash ||                     // { hash }
          result.tx?.hash ||                 // { tx: { hash } }
          result.pendingTransaction?.hash || // { pendingTransaction: { hash } }
          "unknown";

        console.log(`📤 Shelby upload success: ${blobName} | tx: ${txHash}`);

        return {
          accountAddress: this._accountAddress,
          blobName,
          publicUrl: this.publicUrl(blobName),
          shelbyUri: this.shelbyUri(blobName),
          transactionHash: txHash,
        };

      } catch (err: any) {
        lastError = err;
        console.error(`  [Shelby] attempt ${attempt} error: ${err.message}`);

        const isTransient =
          err.message?.includes('500') ||
          err.message?.includes('Internal Server Error') ||
          err.message?.includes('multipart') ||
          err.message?.includes('ECONNRESET') ||
          err.message?.includes('timeout');

        if (isTransient && attempt < 3) {
          const delay = attempt * 2000;
          console.warn(`  [Shelby] transient error, retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  async uploadImage(file: MetadataFile, collectionId: string, index: number): Promise<ShelbyUploadResult> {
    const ext = file.filename.split(".").pop() || "bin";
    return this.uploadBlob(file.buffer, `nfts/${collectionId}/images/${index}.${ext}`);
  }

  async uploadMetadata(metadata: NFTMetadata, collectionId: string, index: number): Promise<ShelbyUploadResult> {
    const blobData = Buffer.from(JSON.stringify(metadata, null, 2));
    return this.uploadBlob(blobData, `nfts/${collectionId}/metadata/${index}.json`);
  }

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
  if (!_instance) _instance = new ShelbyService();
  return _instance;
}

export default getShelbyService;