/**
 * components/DeployForm.tsx
 *
 * 3-step collection deployment wizard:
 *   Step 1 — Upload image + metadata to Shelby
 *   Step 2 — Configure collection (name, symbol, supply, price, chain)
 *   Step 3 — Deploy contract + show result
 *
 * For EVM chains: uses wagmi's writeContract / useAccount.
 * For Solana: uses the backend API (which uses Metaplex + our server keypair).
 * The backend handles Shelby uploads (server-side with the Aptos account).
 */

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  Input,
  Textarea,
  StepIndicator,
  ResultBox,
  SectionHeader,
  Divider,
  Badge,
} from './ui';
import ImageDropzone from './ImageDropzone';
import { useChain } from '../context/ChainContext';
import { nftApi } from '../lib/api';
import { ExternalLink, ChevronRight, Rocket } from 'lucide-react';
import clsx from 'clsx';

// ── Persist to localStorage so Collections page can show it ──────────────
function saveDeployedCollection(data: {
  contractAddress: string;
  transactionHash: string;
  chain: string;
  deployedAt: string;
  name: string;
  symbol: string;
  metadataShelbyUri?: string;
}) {
  if (typeof window === 'undefined') return;
  const KEY = 'nft_foundry_collections';
  const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
  const updated = [
    data,
    ...existing.filter((c: any) => c.contractAddress !== data.contractAddress),
  ];
  localStorage.setItem(KEY, JSON.stringify(updated));
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Attribute {
  trait_type: string;
  value: string;
}

interface DeployResult {
  contractAddress: string;
  transactionHash: string;
  chain: string;
  deployedAt: string;
  metadataShelbyUri?: string;
}

// ── Attribute editor ───────────────────────────────────────────────────────
function AttributeEditor({
  attributes,
  onChange,
}: {
  attributes: Attribute[];
  onChange: (attrs: Attribute[]) => void;
}) {
  const add = () => onChange([...attributes, { trait_type: '', value: '' }]);
  const remove = (i: number) => onChange(attributes.filter((_, idx) => idx !== i));
  const update = (i: number, key: 'trait_type' | 'value', val: string) => {
    const copy = [...attributes];
    copy[i] = { ...copy[i], [key]: val };
    onChange(copy);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono uppercase tracking-widest text-dim">
          Attributes (optional)
        </label>
        <button
          type="button"
          onClick={add}
          className="text-xs font-mono text-amber hover:text-amber-dim transition-colors"
        >
          + Add
        </button>
      </div>
      {attributes.map((attr, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            placeholder="Trait type"
            value={attr.trait_type}
            onChange={(e) => update(i, 'trait_type', e.target.value)}
            className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-amber-dim"
          />
          <input
            placeholder="Value"
            value={attr.value}
            onChange={(e) => update(i, 'value', e.target.value)}
            className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-amber-dim"
          />
          <button
            onClick={() => remove(i)}
            className="text-muted hover:text-red-400 transition-colors text-sm w-6"
          >
            ✕
          </button>
        </div>
      ))}
      {attributes.length === 0 && (
        <p className="text-xs text-muted font-mono">No attributes added</p>
      )}
    </div>
  );
}

// ── Main DeployForm ────────────────────────────────────────────────────────
export default function DeployForm() {
  const { selectedChain } = useChain();
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { publicKey: solanaKey, connected: solanaConnected } = useWallet();

  // Determine if wallet is connected for selected chain
  const isSolana = selectedChain?.type === 'solana';
  const walletConnected = isSolana ? solanaConnected : evmConnected;
  const walletAddress = isSolana
    ? solanaKey?.toBase58()
    : evmAddress;

  // ── Step state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // ── Step 1: NFT media + metadata ─────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [nftName, setNftName] = useState('');
  const [nftDesc, setNftDesc] = useState('');
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [collectionId, setCollectionId] = useState('');
  const [metadataShelbyUri, setMetadataShelbyUri] = useState('');

  // ── Step 2: Collection config ─────────────────────────────────────────
  const [collectionName, setCollectionName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [maxSupply, setMaxSupply] = useState('1000');
  const [mintPrice, setMintPrice] = useState('0.01');
  const [royalty, setRoyalty] = useState('5');

  // ── Step 3: Deploy result ─────────────────────────────────────────────
  const [deployLoading, setDeployLoading] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);

  // ── Step 1: Upload to Shelby ─────────────────────────────────────────
  const handleUpload = async () => {
    if (!imageFile) return toast.error('Please select an image');
    if (!nftName.trim()) return toast.error('NFT name is required');
    if (!nftDesc.trim()) return toast.error('Description is required');

    setUploadLoading(true);
    const toastId = toast.loading('Uploading to Shelby...');

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('name', nftName);
      formData.append('description', nftDesc);
      if (attributes.length > 0) {
        formData.append('attributes', JSON.stringify(attributes));
      }

      const res = await nftApi.uploadMetadata(formData);
      setCollectionId(res.collectionId);
      setMetadataShelbyUri(res.metadataShelbyUri);
      toast.success('Uploaded to Shelby!', { id: toastId });
      setStep(1);
    } catch (err: any) {
      toast.error(err?.response?.data?.details || err.message || 'Upload failed', {
        id: toastId,
      });
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Step 2 → 3: Deploy ────────────────────────────────────────────────
  const handleDeploy = async () => {
    if (!collectionName.trim()) return toast.error('Collection name is required');
    if (!symbol.trim()) return toast.error('Symbol is required');
    if (!selectedChain) return toast.error('Select a chain first');

    setDeployLoading(true);
    const toastId = toast.loading(`Deploying on ${selectedChain.name}...`);

    try {
      const res = await nftApi.deploy({
        name: collectionName,
        symbol: symbol.toUpperCase(),
        description: nftDesc,
        maxSupply: parseInt(maxSupply, 10),
        mintPrice,
        royaltyPercentage: parseFloat(royalty),
        chain: selectedChain.id,
        baseTokenURI: metadataShelbyUri,
      });

      const deployedData = { ...res.deployment, metadataShelbyUri };
      setResult(deployedData);
      // Persist so Collections page can list it
      saveDeployedCollection({
        ...res.deployment,
        name: collectionName,
        symbol: symbol.toUpperCase(),
        metadataShelbyUri,
      });
      toast.success('Collection deployed!', { id: toastId });
      setStep(2);
    } catch (err: any) {
      toast.error(err?.response?.data?.details || err.message || 'Deploy failed', {
        id: toastId,
      });
    } finally {
      setDeployLoading(false);
    }
  };

  // ── Explorer URL helper ────────────────────────────────────────────────
  const explorerTxUrl = result
    ? selectedChain?.explorerUrl
      ? `${selectedChain.explorerUrl}/tx/${result.transactionHash}`
      : '#'
    : '#';

  const explorerAddrUrl = result
    ? selectedChain?.explorerUrl
      ? `${selectedChain.explorerUrl}/address/${result.contractAddress}`
      : '#'
    : '#';

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Steps */}
      <StepIndicator
        steps={['Upload to Shelby', 'Configure Collection', 'Deployed']}
        current={step}
      />

      {/* Wallet gate */}
      {!walletConnected && (
        <div className="flex items-center gap-3 p-4 bg-amber-glow border border-amber-dim/30 rounded">
          <span className="text-amber text-lg">⚡</span>
          <div>
            <p className="text-sm font-mono text-amber font-medium">
              Connect your wallet to continue
            </p>
            <p className="text-xs text-dim font-mono mt-0.5">
              Use the Connect button in the top-right — make sure you're on{' '}
              <strong>{selectedChain?.name}</strong>
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 0: Upload ─────────────────────────────────────────────── */}
      {step === 0 && (
        <Card bracket className="animate-fade-up">
          <SectionHeader
            step="01"
            title="Upload NFT Media to Shelby"
            subtitle="Your image and metadata will be stored permanently on the Shelby Protocol"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageDropzone file={imageFile} onFileChange={setImageFile} />

            <div className="flex flex-col gap-4">
              <Input
                label="NFT Name"
                placeholder="My Awesome NFT #1"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
              />
              <Textarea
                label="Description"
                placeholder="A brief description of this NFT..."
                rows={3}
                value={nftDesc}
                onChange={(e) => setNftDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5">
            <AttributeEditor attributes={attributes} onChange={setAttributes} />
          </div>

          <Divider />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-amber" />
              Stored on Shelby Protocol (Shelbynet)
            </div>
            <Button
              onClick={handleUpload}
              loading={uploadLoading}
              disabled={!walletConnected || !imageFile}
            >
              Upload to Shelby
              <ChevronRight size={14} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 1: Configure + Deploy ─────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4 animate-fade-up">
          {/* Shelby upload success summary */}
          <Card className="border-amber-dim/30 bg-amber-glow/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-400 text-sm">✓</span>
              <span className="text-xs font-mono text-green-400 uppercase tracking-widest">
                Stored on Shelby
              </span>
            </div>
            <ResultBox
              label="Metadata Shelby URI"
              value={metadataShelbyUri}
            />
          </Card>

          <Card bracket>
            <SectionHeader
              step="02"
              title="Configure Your Collection"
              subtitle="Set the on-chain parameters for your NFT smart contract"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Collection Name"
                placeholder="My NFT Collection"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
              />
              <Input
                label="Token Symbol"
                placeholder="MNFT"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase().slice(0, 10))}
              />
              <Input
                label="Max Supply"
                type="number"
                min="1"
                placeholder="1000"
                value={maxSupply}
                onChange={(e) => setMaxSupply(e.target.value)}
              />
              <Input
                label="Mint Price"
                type="number"
                min="0"
                step="0.001"
                placeholder="0.01"
                value={mintPrice}
                onChange={(e) => setMintPrice(e.target.value)}
                suffix={selectedChain?.nativeCurrency.symbol || 'ETH'}
              />
              <Input
                label="Royalty %"
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={royalty}
                onChange={(e) => setRoyalty(e.target.value)}
                suffix="%"
                hint="Secondary sale royalty (0–20%)"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase tracking-widest text-dim">
                  Network
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded">
                  <span className="text-amber">
                    {selectedChain?.type === 'solana' ? '◎' : '⟠'}
                  </span>
                  <span className="text-sm font-mono text-text">{selectedChain?.name}</span>
                  <Badge variant="amber" className="ml-auto">
                    {selectedChain?.network}
                  </Badge>
                </div>
              </div>
            </div>

            <Divider />

            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setStep(0)}
                className="text-xs font-mono text-muted hover:text-dim transition-colors"
              >
                ← Back
              </button>
              <Button
                onClick={handleDeploy}
                loading={deployLoading}
                disabled={!walletConnected}
                size="lg"
              >
                <Rocket size={14} />
                Deploy Collection
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 2: Success ────────────────────────────────────────────── */}
      {step === 2 && result && (
        <Card bracket className="animate-fade-up border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-sm bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <span className="text-green-400 text-base">✓</span>
            </div>
            <div>
              <h2 className="font-display text-2xl text-green-400">
                Collection Deployed
              </h2>
              <p className="text-xs text-dim font-mono mt-0.5">
                {new Date(result.deployedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <ResultBox
              label="Contract Address"
              value={result.contractAddress}
              href={explorerAddrUrl}
            />
            <ResultBox
              label="Transaction Hash"
              value={result.transactionHash}
              href={explorerTxUrl}
            />
            <ResultBox
              label="Metadata Shelby URI"
              value={metadataShelbyUri}
            />
            <ResultBox
              label="Chain"
              value={result.chain.toUpperCase()}
              mono={false}
            />
          </div>

          <Divider />

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setStep(0);
                setImageFile(null);
                setNftName('');
                setNftDesc('');
                setAttributes([]);
                setCollectionName('');
                setSymbol('');
                setResult(null);
                setMetadataShelbyUri('');
              }}
            >
              Deploy Another
            </Button>
            <Button
              onClick={() =>
                (window.location.href = `/mint?contract=${result.contractAddress}&chain=${selectedChain?.id}`)
              }
            >
              Go to Mint →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}