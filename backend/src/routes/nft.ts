/**
 * routes/nft.ts
 *
 * Endpoints:
 *   POST /api/nft/upload-metadata    — upload single NFT image + metadata to Shelby
 *   POST /api/nft/upload-collection  — upload multiple NFTs to Shelby
 *   POST /api/nft/deploy             — deploy NFT collection on a chain
 *   POST /api/nft/mint               — mint an NFT on an existing collection
 *   GET  /api/nft/chains             — list supported chains
 */

import express, { Request, Response } from "express";
import multer from "multer";
import { deployEVMCollection, mintEVMNFT } from "../services/evm";
import { deploySolanaCollection, mintSolanaNFT } from "../services/solana";
import { getShelbyService } from "../services/shelby";
import { NFTCollectionConfig, NFTMetadata, UploadedFile } from "../types";
import { randomUUID } from "crypto";

const router = express.Router();

// ─── Multer file upload config ────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
  },
});

// ─── POST /api/nft/upload-metadata ───────────────────────────────────────

router.post(
  "/upload-metadata",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const shelby = getShelbyService();
      const collectionId = req.body.collectionId || randomUUID();
      const index = parseInt(req.body.index || "1", 10);

      const metadata: Omit<NFTMetadata, "image"> = {
        name: req.body.name,
        description: req.body.description,
        attributes: req.body.attributes
          ? JSON.parse(req.body.attributes)
          : undefined,
        external_url: req.body.external_url || undefined,
        animation_url: req.body.animation_url || undefined,
      };

      if (!metadata.name || !metadata.description) {
        return res.status(400).json({ error: "name and description are required" });
      }

      const imageFile: UploadedFile = {
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };

      const { metadataShelbyUri, imageShelbyUri } =
        await shelby.uploadNFTData(imageFile, metadata, collectionId, index);

      res.json({
        success: true,
        collectionId,
        index,
        metadataShelbyUri,
        imageShelbyUri,
        metadataHttpUrl: require("../services/shelby").ShelbyService.shelbyUriToHttpUrl(metadataShelbyUri),
        imageHttpUrl: require("../services/shelby").ShelbyService.shelbyUriToHttpUrl(imageShelbyUri),
        message: "NFT metadata uploaded to Shelby successfully",
      });
    } catch (error) {
      console.error("Upload metadata error:", error);
      res.status(500).json({
        error: "Failed to upload metadata",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// ─── POST /api/nft/upload-collection ──────────────────────────────────────

router.post(
  "/upload-collection",
  upload.array("images", 100),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No image files provided" });
      }

      let metadataArray: Array<Omit<NFTMetadata, "image">>;
      try {
        metadataArray = JSON.parse(req.body.metadata);
      } catch {
        return res.status(400).json({ error: "metadata must be a valid JSON array" });
      }

      if (metadataArray.length !== files.length) {
        return res.status(400).json({
          error: `metadata array length (${metadataArray.length}) must match number of images (${files.length})`,
        });
      }

      const shelby = getShelbyService();
      const collectionId = req.body.collectionId || randomUUID();

      const imageFiles: UploadedFile[] = files.map((file) => ({
        buffer: file.buffer,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      }));

      const metadataShelbyUris = await shelby.uploadCollection(
        imageFiles,
        metadataArray,
        collectionId
      );

      res.json({
        success: true,
        collectionId,
        count: metadataShelbyUris.length,
        metadataShelbyUris,
        message: "Collection uploaded to Shelby successfully",
      });
    } catch (error) {
      console.error("Upload collection error:", error);
      res.status(500).json({
        error: "Failed to upload collection metadata",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// ─── POST /api/nft/deploy ─────────────────────────────────────────────────

router.post("/deploy", async (req: Request, res: Response) => {
  try {
    const config: NFTCollectionConfig = req.body;

    if (!config.name || !config.symbol || !config.chain) {
      return res.status(400).json({
        error: "Missing required fields: name, symbol, chain",
      });
    }

    let result;

    switch (config.chain.toLowerCase()) {
      case "ethereum":
      case "sepolia":
        result = await deployEVMCollection(config);
        break;
      case "polygon":
      case "polygon-mumbai":
        result = await deployEVMCollection({ ...config, chain: "polygon" });
        break;
      case "solana":
      case "solana-devnet":
        result = await deploySolanaCollection(config);
        break;
      default:
        return res.status(400).json({
          error: `Unsupported chain: ${config.chain}`,
          supportedChains: ["sepolia", "polygon-mumbai", "solana-devnet"],
        });
    }

    res.json({
      success: true,
      deployment: result,
      message: "Collection deployed successfully",
    });
  } catch (error) {
    console.error("Deploy collection error:", error);
    res.status(500).json({
      error: "Failed to deploy collection",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ─── POST /api/nft/mint ───────────────────────────────────────────────────

router.post("/mint", async (req: Request, res: Response) => {
  try {
    const { contractAddress, recipient, metadataUri, chain } = req.body;

    if (!contractAddress || !recipient || !metadataUri || !chain) {
      return res.status(400).json({
        error: "Missing required fields: contractAddress, recipient, metadataUri, chain",
      });
    }

    let result;

    switch (chain.toLowerCase()) {
      case "ethereum":
      case "sepolia":
        result = await mintEVMNFT({ contractAddress, recipient, metadataUri });
        break;
      case "polygon":
      case "polygon-mumbai":
        result = await mintEVMNFT({ contractAddress, recipient, metadataUri });
        break;
      case "solana":
      case "solana-devnet":
        result = await mintSolanaNFT({ contractAddress, recipient, metadataUri });
        break;
      default:
        return res.status(400).json({ error: `Unsupported chain: ${chain}` });
    }

    res.json({ success: true, mint: result, message: "NFT minted successfully" });
  } catch (error) {
    console.error("Mint NFT error:", error);
    res.status(500).json({
      error: "Failed to mint NFT",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ─── GET /api/nft/chains ──────────────────────────────────────────────────

router.get("/chains", (_req: Request, res: Response) => {
  const chains = [
    {
      id: "sepolia",
      name: "Ethereum Sepolia",
      type: "evm",
      network: "testnet",
      chainId: 11155111,
      nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
      explorerUrl: "https://sepolia.etherscan.io",
    },
    {
      id: "polygon-mumbai",
      name: "Polygon Mumbai",
      type: "evm",
      network: "testnet",
      chainId: 80001,
      nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
      explorerUrl: "https://mumbai.polygonscan.com",
    },
    {
      id: "solana-devnet",
      name: "Solana Devnet",
      type: "solana",
      network: "testnet",
      nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
      explorerUrl: "https://explorer.solana.com/?cluster=devnet",
    },
  ];

  res.json({ chains });
});

// ─── GET /api/nft/collection/:chain/:address ──────────────────────────────
// Read on-chain collection info (name, symbol, supply, mint price, etc.)

router.get("/collection/:chain/:address", async (req: Request, res: Response) => {
  try {
    const { chain, address } = req.params;

    const NFT_ABI = [
      "function name() external view returns (string)",
      "function symbol() external view returns (string)",
      "function totalSupply() external view returns (uint256)",
      "function maxSupply() external view returns (uint256)",
      "function mintPrice() external view returns (uint256)",
      "function publicMintEnabled() external view returns (bool)",
      "function baseTokenURI() external view returns (string)",
    ];

    switch (chain.toLowerCase()) {
      case "sepolia":
      case "ethereum": {
        const { ethers } = await import("ethers");
        const rpcUrl = process.env.EVM_RPC_URL;
        if (!rpcUrl) return res.status(503).json({ error: "EVM_RPC_URL not configured" });
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(address, NFT_ABI, provider);
        const [name, symbol, totalSupply, maxSupply, mintPrice, publicMintEnabled, baseTokenURI] =
          await Promise.all([
            contract.name(),
            contract.symbol(),
            contract.totalSupply(),
            contract.maxSupply(),
            contract.mintPrice(),
            contract.publicMintEnabled(),
            contract.baseTokenURI(),
          ]);
        return res.json({
          contractAddress: address,
          chain,
          name,
          symbol,
          totalSupply: totalSupply.toString(),
          maxSupply: maxSupply.toString(),
          mintPrice: ethers.formatEther(mintPrice),
          mintPriceRaw: mintPrice.toString(),
          publicMintEnabled,
          baseTokenURI,
        });
      }

      case "polygon-mumbai":
      case "polygon": {
        const { ethers } = await import("ethers");
        const rpcUrl = process.env.POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com";
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(address, NFT_ABI, provider);
        const [name, symbol, totalSupply, maxSupply, mintPrice, publicMintEnabled, baseTokenURI] =
          await Promise.all([
            contract.name(),
            contract.symbol(),
            contract.totalSupply(),
            contract.maxSupply(),
            contract.mintPrice(),
            contract.publicMintEnabled(),
            contract.baseTokenURI(),
          ]);
        return res.json({
          contractAddress: address,
          chain,
          name,
          symbol,
          totalSupply: totalSupply.toString(),
          maxSupply: maxSupply.toString(),
          mintPrice: ethers.formatEther(mintPrice),
          mintPriceRaw: mintPrice.toString(),
          publicMintEnabled,
          baseTokenURI,
        });
      }

      default:
        return res.status(400).json({ error: `Chain ${chain} collection lookup not yet supported` });
    }
  } catch (error) {
    console.error("Collection info error:", error);
    res.status(500).json({
      error: "Failed to fetch collection info",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;