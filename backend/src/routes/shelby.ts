/**
 * routes/shelby.ts
 *
 * Endpoints:
 *   GET  /api/shelby/status           — health check + account info
 *   GET  /api/shelby/retrieve/:blobName  — download a blob by blobName
 *   GET  /api/shelby/url              — convert shelby:// URI to HTTP URL (no download)
 */

import express, { Request, Response } from "express";
import { getShelbyService, ShelbyService } from "../services/shelby";

const router = express.Router();

/**
 * GET /api/shelby/status
 * Returns whether the service is configured and the uploader account address.
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const service = getShelbyService();
    res.json({
      status: "connected",
      accountAddress: service.getAccountAddress(),
      network: process.env.SHELBY_NETWORK || "shelbynet",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      hint: "Make sure SHELBY_PRIVATE_KEY and SHELBY_NETWORK are set in .env",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/shelby/retrieve/*
 * Download a blob by its blobName path.
 * Example: GET /api/shelby/retrieve/nfts/my-collection/metadata/1.json
 */
router.get("/retrieve/*", async (req: Request, res: Response) => {
  try {
    // Express wildcard captures everything after /retrieve/
    const blobName = (req.params as any)[0];

    if (!blobName) {
      return res.status(400).json({ error: "blobName path parameter is required" });
    }

    const service = getShelbyService();
    const data = await service.download(blobName);

    // Sniff content type from first bytes / extension
    const ext = blobName.split(".").pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      json: "application/json",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      mp4: "video/mp4",
    };
    const contentType =
      contentTypeMap[ext || ""] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(data);
  } catch (error) {
    console.error("Shelby retrieve error:", error);
    res.status(404).json({
      error: "Failed to retrieve blob from Shelby",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/shelby/url?uri=shelby://...
 * Convert a shelby:// URI to a public HTTP URL without downloading.
 */
router.get("/url", (req: Request, res: Response) => {
  try {
    const { uri } = req.query;
    if (!uri || typeof uri !== "string") {
      return res.status(400).json({ error: "uri query param is required" });
    }
    if (!uri.startsWith("shelby://")) {
      return res.status(400).json({ error: "URI must start with shelby://" });
    }

    const httpUrl = ShelbyService.shelbyUriToHttpUrl(uri);
    res.json({ shelbyUri: uri, httpUrl });
  } catch (error) {
    res.status(400).json({
      error: "Failed to convert URI",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;