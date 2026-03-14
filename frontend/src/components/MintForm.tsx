/**
 * components/MintForm.tsx
 *
 * Mint flow:
 *   1. User pastes a contract address + selects chain
 *   2. Uploads an image → Shelby stores it
 *   3. Mints the NFT (backend calls the smart contract)
 *
 * If contractAddress + chain are passed as query params (from the deploy success page),
 * they are pre-filled automatically.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
import { Hammer, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface Attribute {
  trait_type: string;
  value: string;
}

interface MintResult {
  tokenId: string | number;
  transactionHash: string;
  metadataUri: string;
  recipient: string;
}

export default function MintForm() {
  const router = useRouter();
  const { selectedChain, chains, setSelectedChain } = useChain();
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { publicKey: solanaKey, connected: solanaConnected } = useWallet();

  const isSolana = selectedChain?.type === 'solana';
  const walletConnected = isSolana ? solanaConnected : evmConnected;
  const walletAddress = isSolana ? solanaKey?.toBase58() : evmAddress;

  // ── Pre-fill from query params ────────────────────────────────────────
  const [contractAddress, setContractAddress] = useState('');
  useEffect(() => {
    if (router.query.contract && typeof router.query.contract === 'string') {
      setContractAddress(router.query.contract);
    }
    if (router.query.chain && typeof router.query.chain === 'string') {
      const chain = chains.find((c) => c.id === router.query.chain);
      if (chain) setSelectedChain(chain);
    }
  }, [router.query, chains]);

  // ── Step state ────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  // ── Step 0: Upload media ──────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [nftName, setNftName] = useState('');
  const [nftDesc, setNftDesc] = useState('');
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [metadataShelbyUri, setMetadataShelbyUri] = useState('');

  // ── Step 1: Mint ──────────────────────────────────────────────────────
  const [recipient, setRecipient] = useState('');
  const [mintLoading, setMintLoading] = useState(false);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);

  // Auto-fill recipient with connected wallet
  useEffect(() => {
    if (walletAddress) setRecipient(walletAddress);
  }, [walletAddress]);

  // ── Step 0 handler ────────────────────────────────────────────────────
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

  // ── Step 1 handler ────────────────────────────────────────────────────
  const handleMint = async () => {
    if (!contractAddress.trim()) return toast.error('Contract address is required');
    if (!recipient.trim()) return toast.error('Recipient address is required');
    if (!selectedChain) return toast.error('Select a chain first');

    setMintLoading(true);
    const toastId = toast.loading('Minting NFT...');
    try {
      const res = await nftApi.mint({
        contractAddress,
        recipient,
        metadataUri: metadataShelbyUri,
        chain: selectedChain.id,
      });
      setMintResult(res.mint);
      toast.success('NFT minted!', { id: toastId });
      setStep(2);
    } catch (err: any) {
      toast.error(err?.response?.data?.details || err.message || 'Mint failed', {
        id: toastId,
      });
    } finally {
      setMintLoading(false);
    }
  };

  const explorerBase = selectedChain?.explorerUrl || '';

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator
        steps={['Upload to Shelby', 'Mint NFT', 'Done']}
        current={step}
      />

      {!walletConnected && (
        <div className="flex items-center gap-3 p-4 bg-amber-glow border border-amber-dim/30 rounded">
          <span className="text-amber text-lg">⚡</span>
          <p className="text-sm font-mono text-amber">
            Connect your wallet to mint on {selectedChain?.name}
          </p>
        </div>
      )}

      {/* ── Step 0: Upload ─────────────────────────────────────────────── */}
      {step === 0 && (
        <Card bracket className="animate-fade-up">
          <SectionHeader
            step="01"
            title="Upload NFT to Shelby"
            subtitle="Your NFT's image and metadata will be stored on Shelby Protocol before minting"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageDropzone file={imageFile} onFileChange={setImageFile} />
            <div className="flex flex-col gap-4">
              <Input
                label="NFT Name"
                placeholder="My NFT #42"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
              />
              <Textarea
                label="Description"
                placeholder="Description..."
                rows={3}
                value={nftDesc}
                onChange={(e) => setNftDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase tracking-widest text-dim">
                Attributes (optional)
              </label>
              <button
                onClick={() =>
                  setAttributes([...attributes, { trait_type: '', value: '' }])
                }
                className="text-xs font-mono text-amber hover:text-amber-dim transition-colors"
              >
                + Add
              </button>
            </div>
            {attributes.map((attr, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  placeholder="Trait"
                  value={attr.trait_type}
                  onChange={(e) => {
                    const c = [...attributes];
                    c[i].trait_type = e.target.value;
                    setAttributes(c);
                  }}
                  className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-amber-dim"
                />
                <input
                  placeholder="Value"
                  value={attr.value}
                  onChange={(e) => {
                    const c = [...attributes];
                    c[i].value = e.target.value;
                    setAttributes(c);
                  }}
                  className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-amber-dim"
                />
                <button
                  onClick={() => setAttributes(attributes.filter((_, idx) => idx !== i))}
                  className="text-muted hover:text-red-400 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <Divider />
          <div className="flex justify-end">
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

      {/* ── Step 1: Mint ───────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4 animate-fade-up">
          <Card className="border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-400 text-sm">✓</span>
              <span className="text-xs font-mono text-green-400 uppercase tracking-widest">
                Stored on Shelby
              </span>
            </div>
            <ResultBox label="Metadata URI" value={metadataShelbyUri} />
          </Card>

          <Card bracket>
            <SectionHeader
              step="02"
              title="Mint NFT"
              subtitle="Mint this NFT into an existing collection contract"
            />

            <div className="flex flex-col gap-4">
              <Input
                label="Contract Address"
                placeholder={isSolana ? 'Collection mint address...' : '0x...'}
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                hint="The collection contract address from your deployment"
              />
              <Input
                label="Recipient Address"
                placeholder={isSolana ? 'Solana public key...' : '0x...'}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                hint="Wallet that will receive this NFT"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase tracking-widest text-dim">
                  Chain
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded">
                  <span className="text-amber">{isSolana ? '◎' : '⟠'}</span>
                  <span className="text-sm font-mono text-text">{selectedChain?.name}</span>
                  <Badge variant="amber" className="ml-auto">{selectedChain?.network}</Badge>
                </div>
              </div>
            </div>

            <Divider />
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(0)}
                className="text-xs font-mono text-muted hover:text-dim transition-colors"
              >
                ← Back
              </button>
              <Button
                onClick={handleMint}
                loading={mintLoading}
                disabled={!walletConnected}
                size="lg"
              >
                <Hammer size={14} />
                Mint NFT
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Step 2: Success ────────────────────────────────────────────── */}
      {step === 2 && mintResult && (
        <Card bracket className="animate-fade-up border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-sm bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <span className="text-green-400 text-base">✓</span>
            </div>
            <h2 className="font-display text-2xl text-green-400">NFT Minted</h2>
          </div>

          <div className="flex flex-col gap-3">
            <ResultBox
              label="Token ID"
              value={String(mintResult.tokenId)}
            />
            <ResultBox
              label="Transaction Hash"
              value={mintResult.transactionHash}
              href={explorerBase ? `${explorerBase}/tx/${mintResult.transactionHash}` : undefined}
            />
            <ResultBox
              label="Metadata URI"
              value={mintResult.metadataUri}
            />
            <ResultBox
              label="Recipient"
              value={mintResult.recipient}
            />
          </div>

          <Divider />
          <Button
            variant="secondary"
            onClick={() => {
              setStep(0);
              setImageFile(null);
              setNftName('');
              setNftDesc('');
              setMetadataShelbyUri('');
              setMintResult(null);
            }}
          >
            Mint Another
          </Button>
        </Card>
      )}
    </div>
  );
}