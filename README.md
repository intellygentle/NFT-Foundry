# 🔥 NFT Foundry

Multi-chain NFT deployment platform with **Shelby Protocol** decentralized storage.
Deploy NFT collections on Ethereum, Polygon, and Solana. All metadata is stored permanently on Shelby — censorship-resistant, built on Aptos.

---

## Architecture

```
nft-foundry/
├── frontend/          Next.js 14 app (Wagmi + RainbowKit + Solana Wallet Adapter)
├── backend/           Express API (TypeScript) — Shelby uploads, chain interactions
└── contracts/
    ├── evm/           Hardhat — ShelbyNFT + ShelbyNFTFactory (Solidity)
    └── solana/        Anchor — Solana NFT program (Rust, placeholder)
```

### How it works

```
User selects chain → connects wallet → uploads NFT image
    ↓
Backend receives image → uploads to Shelby Protocol (Aptos-based storage)
    ↓
Shelby returns blobName + account address
    ↓
Backend builds shelby:// URI  (e.g. shelby://0xabc.../nfts/col1/metadata/1.json)
    ↓
User deploys collection contract → shelby:// URI stored on-chain as tokenURI
    ↓
Marketplaces resolve shelby:// → Shelby HTTP gateway → metadata JSON
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18 | Required by Shelby SDK |
| npm | ≥ 9 | |
| Hardhat | bundled | EVM contract compilation |
| Solana CLI | ≥ 1.18 | Only if using Solana |

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd nft-foundry
npm run install:all
```

### 2. Set up Shelby

Shelby is the decentralized storage layer. It runs on the Aptos blockchain (testnet: Shelbynet).

**a) Get an API key**
- Go to [geomi.dev](https://geomi.dev)
- Create account → "API Resource" → select **Testnet** → copy key (format: `aptoslabs_***`)

**b) Generate an Aptos uploader account**
```bash
node -e "
const { Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');
const a = Account.generate();
console.log('Address    :', a.accountAddress.toString());
console.log('Private Key:', a.privateKey.toString());
"
```

**c) Fund your account**

Your Shelby uploader account needs two tokens:
- **APT** — for Aptos gas fees
- **ShelbyUSD** — for storage payments

Fund it using the faucet at: https://docs.shelby.xyz/sdks/typescript/node/guides/uploading-file

### 3. Configure environment

**Backend** — copy and fill in:
```bash
cp backend/.env.example backend/.env
```

Required values:
```env
SHELBY_NETWORK=shelbynet
SHELBY_API_KEY=aptoslabs_your_key_here
SHELBY_PRIVATE_KEY=ed25519-priv-your_key_here

EVM_RPC_URL=https://sepolia.infura.io/v3/your-project-id
EVM_PRIVATE_KEY=your_evm_hex_private_key

# Set AFTER deploying contracts (Step 5):
EVM_FACTORY_ADDRESS=0x...
```

**Frontend** — copy and fill in:
```bash
cp frontend/.env.local.example frontend/.env.local
```

Required values:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id_from_cloud.walletconnect.com
```

Get a free WalletConnect project ID at: https://cloud.walletconnect.com

### 4. Install dependencies

```bash
npm run install:all
```

This installs backend, frontend, and contract dependencies.

### 5. Compile and deploy contracts

```bash
# Compile
npm run compile:contracts

# Deploy to Sepolia testnet
cd contracts/evm && npm run deploy:sepolia

# OR deploy to Polygon Mumbai
cd contracts/evm && npm run deploy:polygon-mumbai
```

After deployment, copy the factory address to `backend/.env`:
```env
EVM_FACTORY_ADDRESS=0xYourFactoryAddressHere
```

Get testnet ETH:
- Sepolia: https://sepoliafaucet.com
- Polygon Mumbai: https://faucet.polygon.technology

### 6. Run the stack

```bash
# Terminal 1 — backend (port 3001)
npm run dev:backend

# Terminal 2 — frontend (port 3000)
npm run dev:frontend
```

Or run both together:
```bash
npm run dev
```

Open: **http://localhost:3000**

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Deploy a single NFT collection (upload 1 image → configure → deploy) |
| `/batch` | Batch deploy — upload many images at once, edit metadata per item |
| `/mint` | Mint an NFT into an existing collection |
| `/collections` | Browse collections deployed from this browser session |
| `/collection/[address]?chain=sepolia` | Collection detail page (on-chain stats + mint) |

---

## API Endpoints

### NFT
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nft/chains` | List supported chains |
| POST | `/api/nft/upload-metadata` | Upload single NFT to Shelby (multipart) |
| POST | `/api/nft/upload-collection` | Upload batch to Shelby (multipart) |
| POST | `/api/nft/deploy` | Deploy collection contract |
| POST | `/api/nft/mint` | Mint NFT into collection |
| GET | `/api/nft/collection/:chain/:address` | Read on-chain collection info |

### Shelby
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shelby/status` | Shelby connection + account info |
| GET | `/api/shelby/retrieve/*` | Download a blob by blobName |
| GET | `/api/shelby/url?uri=shelby://...` | Convert shelby:// to HTTP URL |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wallet/verify` | Verify wallet signature (EVM or Solana) |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server + all services status |

---

## Shelby Storage

Shelby Protocol is a decentralized storage network built on Aptos. NFT metadata is addressed as:

```
shelby://{aptosAccountAddress}/{blobName}
```

Example:
```
shelby://0xabc123.../nfts/my-collection/metadata/1.json
```

This URI is stored in the NFT contract's `tokenURI`. To retrieve the metadata, resolve via:
```
https://api.shelbynet.shelby.xyz/shelby/v1/blobs/{accountAddress}/{blobName}
```

The backend creates one Aptos account as the "uploader" — all blobs are stored under this account. The `SHELBY_PRIVATE_KEY` in `.env` controls this account.

**Blob naming convention:**
```
nfts/{collectionId}/images/{index}.{ext}    ← image
nfts/{collectionId}/metadata/{index}.json   ← metadata JSON
```

---

## Smart Contracts

### ShelbyNFT

ERC-721 with Shelby-native storage:
- Stores Shelby CID per token (mapping `tokenId → shelbyCID`)
- `tokenURI()` returns `shelby://{cid}`
- `mint(address, shelbyCID)` — public mint with payment
- `ownerMint(address, shelbyCID)` — free owner mint
- `batchMint(address, shelbyCIDs[])` — batch mint
- `togglePublicMint()` — enable/disable public minting
- `pause()` / `unpause()` — emergency stop

### ShelbyNFTFactory

Creates new ShelbyNFT collections:
- `deployCollection(name, symbol, maxSupply, mintPrice, baseTokenURI)` → deploys new ShelbyNFT and transfers ownership to `msg.sender`
- Charges a `deploymentFee` (default 0.001 ETH)
- Tracks all collections per creator

### Run tests

```bash
cd contracts/evm
npm test
```

---

## Supported Chains

| Chain | ID | Type | Status |
|-------|----|------|--------|
| Ethereum Sepolia | `sepolia` | EVM | ✅ Testnet |
| Polygon Mumbai | `polygon-mumbai` | EVM | ✅ Testnet |
| Solana Devnet | `solana-devnet` | Solana | ✅ Testnet (via Metaplex) |

To add a new EVM chain:
1. Add it to `backend/src/routes/nft.ts` `/api/nft/chains`
2. Add RPC URL + factory address env vars
3. Add a case to `backend/src/services/evm.ts` `getChainConfig()`
4. Add a new Hardhat network to `contracts/evm/hardhat.config.ts`

---

## Scripts Reference

```bash
# Install everything
npm run install:all

# Development
npm run dev              # both backend + frontend concurrently
npm run dev:backend      # backend only (port 3001)
npm run dev:frontend     # frontend only (port 3000)

# Build
npm run build:backend
npm run build:frontend
npm run build            # both

# Contracts
npm run compile:contracts
cd contracts/evm && npm run deploy:sepolia
cd contracts/evm && npm run deploy:polygon-mumbai
cd contracts/evm && npm test
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | Server port (default: 3001) |
| `NODE_ENV` | no | `development` or `production` |
| `SHELBY_NETWORK` | yes | `shelbynet` (testnet) or `mainnet` |
| `SHELBY_API_KEY` | yes | API key from geomi.dev |
| `SHELBY_PRIVATE_KEY` | yes | Aptos Ed25519 private key for uploader account |
| `EVM_RPC_URL` | yes | Infura/Alchemy RPC for EVM chains |
| `EVM_PRIVATE_KEY` | yes | Hex private key for EVM contract deployer |
| `EVM_FACTORY_ADDRESS` | yes | Deployed ShelbyNFTFactory address (Sepolia) |
| `POLYGON_RPC_URL` | no | Polygon RPC (default: Mumbai public) |
| `POLYGON_FACTORY_ADDRESS` | no | Deployed factory on Polygon |
| `SOLANA_RPC_URL` | no | Solana RPC (default: devnet) |
| `SOLANA_PRIVATE_KEY` | no | Base64-encoded Solana keypair JSON |
| `ETHERSCAN_API_KEY` | no | For contract verification |
| `ALLOWED_ORIGINS` | no | Comma-separated CORS origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | yes | Backend URL (default: http://localhost:3001) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | yes | From cloud.walletconnect.com |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | no | Solana RPC override |

---

## Troubleshooting

**"SHELBY_PRIVATE_KEY not set"**
Generate an Aptos key and set it in `backend/.env`. See Setup Step 2b above.

**"Factory contract not deployed"**
You haven't deployed the EVM contracts yet, or forgot to copy the address to `.env`. Run `npm run deploy:sepolia` in `contracts/evm`.

**"Insufficient payment" on mint**
The collection's `mintPrice` is greater than 0 and you didn't send enough ETH. Check the contract's mint price.

**Shelby upload times out**
Your uploader account may be out of ShelbyUSD. Re-fund it from the faucet at docs.shelby.xyz.

**WalletConnect modal doesn't open**
Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `frontend/.env.local`. Get a free key at cloud.walletconnect.com.

**Images not loading from Shelby**
Shelby uses the HTTP gateway: `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/{account}/{blobName}`. Ensure blobs haven't expired (default TTL is 30 days).

---

## Resources

- [Shelby Protocol Docs](https://docs.shelby.xyz)
- [Shelby SDK Quickstart](https://docs.shelby.xyz/sdks/typescript/node/guides/uploading-file)
- [Get API Key (Geomi)](https://geomi.dev)
- [Shelby GitHub](https://github.com/shelby/examples)
- [RainbowKit Docs](https://www.rainbowkit.com/docs)
- [Wagmi Docs](https://wagmi.sh)
- [Hardhat Docs](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x)