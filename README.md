# 🔥 NFT Foundry

A multi-chain NFT deployment platform with **Shelby Protocol** decentralized storage.
Deploy NFT collections on Ethereum Sepolia and Polygon Mumbai. All metadata is stored permanently on Shelby — censorship-resistant, built on Aptos.

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | https://nft-foundry.vercel.app |
| **Backend API** | https://nft-foundry-production.up.railway.app |
| **Health Check** | https://nft-foundry-production.up.railway.app/health |

---

## ✨ Features

- **Multi-chain deployment** — Ethereum Sepolia, Polygon Mumbai, Solana Devnet
- **Shelby Protocol storage** — NFT images and metadata stored on decentralized Aptos-based storage
- **Three wallet types** — EVM (MetaMask/RainbowKit), Solana (Phantom/Solflare), Aptos (Petra)
- **Batch deploy** — upload an entire collection at once, edit metadata per item
- **Single deploy** — upload one NFT image, configure collection, deploy contract
- **Mint** — mint NFTs into any deployed collection
- **Collections** — browse your deployed collections with on-chain stats

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                     │
│              Next.js 14 + Wagmi + RainbowKit             │
│         Solana Wallet Adapter + Aptos Wallet Adapter     │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│                   Backend (Railway)                      │
│                  Express + TypeScript                    │
│                                                          │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ Shelby SDK   │  │  ethers.js  │  │  Metaplex UMI │  │
│  │ (storage)    │  │  (EVM)      │  │  (Solana)     │  │
│  └──────┬───────┘  └──────┬──────┘  └───────┬───────┘  │
└─────────┼────────────────┼─────────────────┼───────────┘
          │                │                 │
          ▼                ▼                 ▼
   Shelby Protocol   Ethereum Sepolia   Solana Devnet
   (Aptos-based)     Smart Contracts    Programs
```

---

## 🔄 How It Works

```
1. User connects wallets (Aptos for Shelby, EVM/Solana for contracts)
2. User uploads NFT image + metadata
3. Backend uploads to Shelby → returns shelby:// URI
4. User deploys collection contract → shelby:// URI stored on-chain as tokenURI
5. Marketplaces resolve shelby:// → Shelby HTTP gateway → metadata JSON
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- MetaMask browser extension
- Petra wallet browser extension (for Shelby uploads)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/nft-foundry.git
cd nft-foundry
npm run install:all
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in all values — see Environment Variables section below

# Frontend
cp frontend/.env.local.example frontend/.env.local
# Fill in NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
```

### 3. Deploy contracts

```bash
cd contracts/evm
npm install
npm run compile
npm run deploy:sepolia
# Copy the factory address output → backend/.env EVM_FACTORY_ADDRESS
```

### 4. Run

```bash
# Terminal 1 — backend (port 3001)
cd backend && npm run dev

# Terminal 2 — frontend (port 3000)
cd frontend && npm run dev
```

Open **http://localhost:3000**

---

## 🌍 Production Deployment

### Backend → Railway

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub → select `nft-foundry`
3. Settings → Root Directory: leave blank, Build Command: `npm install && npm run build`, Start Command: `node dist/index.js`
4. Add all environment variables from `backend/.env`
5. Generate domain → copy URL for frontend config

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set environment variables in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SHELBY_PRIVATE_KEY` | ✅ | Aptos Ed25519 private key for Shelby uploader account |
| `SHELBY_API_KEY` | ✅ | API key from [geomi.dev](https://geomi.dev) |
| `SHELBY_NETWORK` | ✅ | `shelbynet` (testnet) or `mainnet` |
| `EVM_RPC_URL` | ✅ | Infura/Alchemy RPC endpoint |
| `EVM_PRIVATE_KEY` | ✅ | Deployer wallet private key |
| `EVM_FACTORY_ADDRESS` | ✅ | Deployed ShelbyNFTFactory address |
| `EVM_CHAIN_ID` | ✅ | `11155111` for Sepolia |
| `POLYGON_RPC_URL` | no | Polygon Mumbai RPC |
| `POLYGON_FACTORY_ADDRESS` | no | Factory on Polygon |
| `SOLANA_RPC_URL` | no | Solana RPC (default: devnet) |
| `SOLANA_PRIVATE_KEY` | no | Base64-encoded Solana keypair |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `PORT` | no | Server port (default: 3001) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend URL |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | From [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | no | Solana RPC override |

---

## 📡 API Reference

### NFT Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/nft/chains` | List supported chains |
| `POST` | `/api/nft/upload-metadata` | Upload single NFT to Shelby |
| `POST` | `/api/nft/upload-collection` | Batch upload to Shelby |
| `POST` | `/api/nft/deploy` | Deploy collection contract |
| `POST` | `/api/nft/mint` | Mint NFT into collection |
| `GET` | `/api/nft/collection/:chain/:address` | On-chain collection info |

### Shelby Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/shelby/status` | Shelby connection status |
| `GET` | `/api/shelby/retrieve/*` | Download blob by name |
| `GET` | `/api/shelby/url?uri=shelby://...` | Convert URI to HTTP URL |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Full service health check |
| `POST` | `/api/wallet/verify` | Verify wallet signature |

---

## 🔗 Smart Contracts

### ShelbyNFT (ERC-721)

Stores Shelby CIDs on-chain per token. `tokenURI()` returns `shelby://{accountAddress}/{blobName}`.

Key functions:
- `mint(address to, string shelbyCID)` — public mint with payment
- `ownerMint(address to, string shelbyCID)` — free owner mint
- `batchMint(address to, string[] shelbyCIDs)` — batch mint
- `togglePublicMint()` — enable/disable public minting
- `withdraw()` — withdraw collected mint fees

### ShelbyNFTFactory

Deploys new ShelbyNFT collections. Charges 0.001 ETH deployment fee.

- `deployCollection(name, symbol, maxSupply, mintPrice, baseTokenURI)` → deploys and returns collection address

### Deployed Addresses

| Network | Factory Address |
|---------|----------------|
| Ethereum Sepolia | See `contracts/evm/deployed-addresses.json` |

---

## 🗂 Project Structure

```
nft-foundry/
├── frontend/               # Next.js 14 app
│   └── src/
│       ├── components/     # UI components
│       │   ├── DeployForm.tsx
│       │   ├── MintForm.tsx
│       │   ├── BatchUploadForm.tsx
│       │   ├── Navbar.tsx
│       │   ├── AptosWalletButton.tsx
│       │   └── WalletProviders.tsx
│       ├── pages/          # Next.js pages
│       ├── lib/            # API client, wagmi config, utils
│       ├── context/        # Chain selection context
│       └── hooks/          # Unified wallet hook
├── backend/                # Express API
│   └── src/
│       ├── routes/         # API route handlers
│       ├── services/       # shelby.ts, evm.ts, solana.ts
│       ├── middleware/     # Error handler
│       └── types/          # TypeScript interfaces
└── contracts/
    └── evm/                # Hardhat project
        └── src/
            ├── ShelbyNFT.sol
            └── ShelbyNFTFactory.sol
```

---

## 🧪 Running Tests

```bash
# Contract tests
cd contracts/evm
npm test
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| EVM Wallets | Wagmi v2, RainbowKit v2, viem |
| Solana Wallets | @solana/wallet-adapter |
| Aptos Wallets | @aptos-labs/wallet-adapter-react |
| Backend | Express.js, TypeScript, ts-node |
| EVM Contracts | Solidity 0.8.24, OpenZeppelin v5, Hardhat |
| Solana Programs | Metaplex UMI |
| Storage | Shelby Protocol (@shelby-protocol/sdk) |
| Aptos SDK | @aptos-labs/ts-sdk v5 |
| Frontend Host | Vercel |
| Backend Host | Railway |

---

## ⚠️ Known Limitations (Testnet)

- Shelby uploader account needs periodic refunding with APT + ShelbyUSD from the [Shelby faucet](https://docs.shelby.xyz/sdks/typescript/node/guides/uploading-file) — each upload costs a small gas fee
- Sepolia ETH needed for contract deployment — get from [QuickNode faucet](https://faucet.quicknode.com/ethereum/sepolia)
- Shelby blob TTL is 30 days by default on testnet — blobs expire unless renewed
- Solana deployment uses Metaplex on devnet — requires SOL from `solana airdrop`

---

## 🙏 Resources

- [Shelby Protocol Docs](https://docs.shelby.xyz)
- [Shelby SDK Guide](https://docs.shelby.xyz/sdks/typescript/node/guides/uploading-file)
- [Get Shelby API Key](https://geomi.dev)
- [RainbowKit Docs](https://www.rainbowkit.com/docs)
- [Wagmi Docs](https://wagmi.sh)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x)
- [Hardhat Docs](https://hardhat.org/docs)