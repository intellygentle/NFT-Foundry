/**
 * src/types/declarations.d.ts
 *
 * Minimal type shims for backend packages that show "cannot find module"
 * before `npm install` has been run.
 *
 * Once `npm install` runs, TypeScript uses the real declarations from
 * node_modules and these become inert.
 */

// ── tweetnacl ─────────────────────────────────────────────────────────────
declare module "tweetnacl" {
  const nacl: {
    sign: {
      detached: {
        verify(
          message: Uint8Array,
          signature: Uint8Array,
          publicKey: Uint8Array
        ): boolean;
        sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
      };
    };
    randomBytes(n: number): Uint8Array;
  };
  export = nacl;
  export default nacl;
}

// ── @shelby-protocol/sdk/node ─────────────────────────────────────────────
// The package exports this path as ESM-only ("import" condition, no "require").
// moduleResolution "node" can't resolve it statically — we load it via
// dynamic import() at runtime. This shim silences the TS editor error.
declare module "@shelby-protocol/sdk/node" {
  export class ShelbyNodeClient {
    constructor(config: {
      network?: unknown;
      apiKey?: string;
      [key: string]: unknown;
    });
    upload(params: {
      signer: unknown;
      blobData: Buffer;
      blobName: string;
      expirationMicros: number;
      options?: unknown;
    }): Promise<{
      transaction: { hash: string };
      blobCommitments: unknown;
    }>;
    download(params: {
      account: { toString(): string } | string;
      blobName: string;
      range?: { start: number; end?: number };
    }): Promise<{
      stream: NodeJS.ReadableStream;
      name: string;
      contentLength: number;
    }>;
  }
  export class Ed25519PrivateKey {
    constructor(hexKey: string);
  }
  export class Ed25519Account {
    constructor(opts: { privateKey: Ed25519PrivateKey });
    accountAddress: { toString(): string };
  }
  export const Network: {
    MAINNET: unknown;
    TESTNET: unknown;
    SHELBYNET?: unknown;
    CUSTOM?: unknown;
    [key: string]: unknown;
  };
}