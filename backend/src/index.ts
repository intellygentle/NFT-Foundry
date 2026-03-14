/**
 * backend/src/index.ts
 *
 * Main Express server entry point.
 *
 * Changes from original:
 *  - Added tweetnacl to deps (used by wallet.ts for Solana signature verification)
 *  - Added express.Router wildcard fix: /api/shelby/retrieve/* needs express 4.x style
 *  - Added /api/health with Shelby status check
 *  - Moved Shelby lazy-init to startup (logs account address on boot)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load env first — before any service imports that read process.env
dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import nftRoutes from './routes/nft';
import shelbyRoutes from './routes/shelby';
import walletRoutes from './routes/wallet';
import { getShelbyService } from './services/shelby';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & logging ─────────────────────────────────────────────────────
app.use(
  helmet({
    // Allow cross-origin image loading (NFT images from Shelby)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);

app.use(morgan('combined'));

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/nft', nftRoutes);
app.use('/api/shelby', shelbyRoutes);
app.use('/api/wallet', walletRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  let shelbyStatus: 'ok' | 'error' = 'error';
  let shelbyAccount: string | undefined;

  try {
    const shelby = getShelbyService();
    await shelby.initialize();
    shelbyStatus = 'ok';
    shelbyAccount = shelby.getAccountAddress();
  } catch {
    shelbyStatus = 'error';
  }

  res.json({
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      shelby: {
        status: shelbyStatus,
        account: shelbyAccount,
        network: process.env.SHELBY_NETWORK || 'shelbynet',
      },
      evm: {
        rpcConfigured: !!process.env.EVM_RPC_URL,
        factoryConfigured:
          !!process.env.EVM_FACTORY_ADDRESS &&
          process.env.EVM_FACTORY_ADDRESS !==
            '0x0000000000000000000000000000000000000000',
      },
      solana: {
        rpcConfigured: !!process.env.SOLANA_RPC_URL,
        keypairConfigured: !!process.env.SOLANA_PRIVATE_KEY,
      },
    },
  });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler);

// ── Boot ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔥 NFT Foundry Backend`);
  console.log(`   Port    : ${PORT}`);
  console.log(`   Env     : ${process.env.NODE_ENV || 'development'}`);

  // Shelby init is async (dynamic ESM import) — fire and forget on boot
  const shelby = getShelbyService();
  shelby.initialize()
    .then(() => {
      console.log(`   Shelby  : ✅ ${shelby.getAccountAddress()}`);
      console.log(`   Network : ${process.env.SHELBY_NETWORK || 'shelbynet'}`);
    })
    .catch((err: Error) => {
      console.warn(`   Shelby  : ⚠️  Init failed — ${err.message}`);
    });

  const factoryOk =
    !!process.env.EVM_FACTORY_ADDRESS &&
    process.env.EVM_FACTORY_ADDRESS !== '0x0000000000000000000000000000000000000000';
  console.log(`   EVM     : factory ${factoryOk ? '✅' : '⚠️  (set EVM_FACTORY_ADDRESS after deploying contracts)'}`);

  console.log(`\n   API     : http://localhost:${PORT}/health\n`);
});

export default app;