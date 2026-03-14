/**
 * routes/wallet.ts
 *
 * POST /api/wallet/verify — Verify a wallet signature (EVM or Solana)
 *
 * This replaces the TODO placeholder with real signature verification:
 *   EVM:    ethers.verifyMessage(message, signature) must return the claimed address
 *   Solana: nacl.sign.detached.verify() against the base58-decoded public key
 */

import express, { Request, Response } from "express";
import { ethers } from "ethers";

const router = express.Router();

/**
 * POST /api/wallet/verify
 * Body: { address, signature, message, chain }
 *
 * For EVM wallets:
 *   address   = "0x..." checksummed Ethereum address
 *   signature = "0x..." 65-byte hex signature from personal_sign
 *   message   = the original string that was signed
 *   chain     = "evm" | "ethereum" | "sepolia" | "polygon" | etc.
 *
 * For Solana wallets:
 *   address   = base58 public key
 *   signature = base64-encoded 64-byte Ed25519 signature
 *   message   = the original string that was signed
 *   chain     = "solana" | "solana-devnet"
 */
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { address, signature, message, chain = "evm" } = req.body;

    if (!address || !signature || !message) {
      return res.status(400).json({
        error: "Missing required fields: address, signature, message",
      });
    }

    const chainType = chain.toLowerCase();

    // ── EVM Verification ───────────────────────────────────────────────────
    if (
      chainType === "evm" ||
      chainType === "ethereum" ||
      chainType === "sepolia" ||
      chainType === "polygon" ||
      chainType === "polygon-mumbai"
    ) {
      let recoveredAddress: string;
      try {
        recoveredAddress = ethers.verifyMessage(message, signature);
      } catch {
        return res.status(400).json({
          verified: false,
          error: "Invalid EVM signature format",
        });
      }

      const verified =
        recoveredAddress.toLowerCase() === address.toLowerCase();

      return res.json({
        verified,
        address: recoveredAddress,
        chainType: "evm",
        timestamp: new Date().toISOString(),
        ...(verified ? {} : { error: "Signature address mismatch" }),
      });
    }

    // ── Solana Verification ────────────────────────────────────────────────
    if (chainType === "solana" || chainType === "solana-devnet") {
      // Lazily import to avoid loading @solana/web3.js on EVM-only deploys
      const { PublicKey } = await import("@solana/web3.js");
      const nacl = await import("tweetnacl");

      let pubkeyBytes: Uint8Array;
      try {
        pubkeyBytes = new PublicKey(address).toBytes();
      } catch {
        return res.status(400).json({
          verified: false,
          error: "Invalid Solana public key",
        });
      }

      const messageBytes = new TextEncoder().encode(message);
      // nacl expects Uint8Array — Buffer.from returns a Buffer which extends Uint8Array,
      // but strict TS requires the explicit cast
      const signatureBytes = new Uint8Array(Buffer.from(signature, "base64"));

      const verified = nacl.default.sign.detached.verify(
        messageBytes,
        signatureBytes,
        pubkeyBytes
      );

      return res.json({
        verified,
        address,
        chainType: "solana",
        timestamp: new Date().toISOString(),
        ...(verified ? {} : { error: "Signature address mismatch" }),
      });
    }

    return res.status(400).json({
      error: `Unsupported chain for verification: ${chain}`,
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    res.status(500).json({
      verified: false,
      error: "Verification failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;