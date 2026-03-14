/**
 * components/BatchUploadForm.tsx
 *
 * Batch collection deployment wizard:
 *   Step 0 — Drop multiple images, auto-generate metadata form per image
 *   Step 1 — Edit name/description/attributes per NFT, set collection config
 *   Step 2 — Upload entire batch to Shelby (sequential, with progress bar)
 *   Step 3 — Deploy collection contract with all Shelby URIs as baseURI
 *   Step 4 — Success: show contract address + all Shelby URIs
 */

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import clsx from 'clsx';
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
import { useChain } from '../context/ChainContext';
import { useWalletUnified } from '../hooks/useWalletUnified';
import { nftApi } from '../lib/api';
import {
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Rocket,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Attribute {
  trait_type: string;
  value: string;
}

interface NFTItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  description: string;
  attributes: Attribute[];
  // After upload:
  metadataShelbyUri?: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface CollectionConfig {
  name: string;
  symbol: string;
  description: string;
  maxSupply: string;
  mintPrice: string;
  royalty: string;
}

interface DeployResult {
  contractAddress: string;
  transactionHash: string;
  chain: string;
  deployedAt: string;
}

// ── NFT Item Editor ────────────────────────────────────────────────────────

function NFTItemEditor({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: NFTItem;
  index: number;
  onChange: (id: string, updates: Partial<NFTItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const updateAttr = (i: number, key: 'trait_type' | 'value', val: string) => {
    const attrs = [...item.attributes];
    attrs[i] = { ...attrs[i], [key]: val };
    onChange(item.id, { attributes: attrs });
  };

  const statusColors: Record<NFTItem['status'], string> = {
    pending: 'bg-border',
    uploading: 'bg-amber animate-pulse',
    done: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div
      className={clsx(
        'border rounded-lg overflow-hidden transition-colors duration-150',
        item.status === 'done' ? 'border-green-500/30' : 'border-border',
        item.status === 'error' ? 'border-red-500/30' : ''
      )}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-3 bg-surface-2 cursor-pointer hover:bg-surface transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status dot */}
        <span
          className={clsx('w-2 h-2 rounded-full flex-shrink-0', statusColors[item.status])}
        />

        {/* Thumbnail */}
        <img
          src={item.previewUrl}
          alt=""
          className="w-10 h-10 object-cover rounded border border-border flex-shrink-0"
        />

        {/* Index + name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted">#{String(index + 1).padStart(3, '0')}</span>
            <span className="text-sm font-mono text-text truncate">
              {item.name || 'Unnamed NFT'}
            </span>
          </div>
          <span className="text-xs text-muted font-mono truncate block">
            {item.file.name}
          </span>
        </div>

        {/* Status badge */}
        {item.status === 'done' && (
          <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
        )}
        {item.status === 'error' && (
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className="p-1 text-muted hover:text-red-400 transition-colors"
          >
            <X size={12} />
          </button>
          {expanded ? (
            <ChevronUp size={14} className="text-muted" />
          ) : (
            <ChevronDown size={14} className="text-muted" />
          )}
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="p-4 border-t border-border bg-surface flex flex-col gap-4">
          {item.metadataShelbyUri && (
            <div className="p-2.5 bg-green-500/5 border border-green-500/20 rounded text-xs font-mono text-green-400 break-all">
              {item.metadataShelbyUri}
            </div>
          )}
          {item.error && (
            <div className="p-2.5 bg-red-500/5 border border-red-500/20 rounded text-xs font-mono text-red-400">
              {item.error}
            </div>
          )}

          <Input
            label="Name"
            value={item.name}
            onChange={(e) => onChange(item.id, { name: e.target.value })}
            placeholder={`NFT #${index + 1}`}
          />
          <Textarea
            label="Description"
            value={item.description}
            onChange={(e) => onChange(item.id, { description: e.target.value })}
            rows={2}
            placeholder="Description..."
          />

          {/* Attributes */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-widest text-dim">
                Attributes
              </label>
              <button
                onClick={() =>
                  onChange(item.id, {
                    attributes: [...item.attributes, { trait_type: '', value: '' }],
                  })
                }
                className="text-xs font-mono text-amber hover:text-amber-dim transition-colors"
              >
                + Add
              </button>
            </div>
            {item.attributes.map((attr, i) => (
              <div key={i} className="flex gap-2">
                <input
                  placeholder="Trait"
                  value={attr.trait_type}
                  onChange={(e) => updateAttr(i, 'trait_type', e.target.value)}
                  className="flex-1 bg-surface-2 border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-amber-dim"
                />
                <input
                  placeholder="Value"
                  value={attr.value}
                  onChange={(e) => updateAttr(i, 'value', e.target.value)}
                  className="flex-1 bg-surface-2 border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-amber-dim"
                />
                <button
                  onClick={() =>
                    onChange(item.id, {
                      attributes: item.attributes.filter((_, idx) => idx !== i),
                    })
                  }
                  className="text-muted hover:text-red-400 transition-colors text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────

function UploadProgress({ items }: { items: NFTItem[] }) {
  const done = items.filter((i) => i.status === 'done').length;
  const errors = items.filter((i) => i.status === 'error').length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-dim">
          {done}/{total} uploaded
          {errors > 0 && <span className="text-red-400 ml-2">{errors} errors</span>}
        </span>
        <span className="text-amber">{pct}%</span>
      </div>
      <div className="h-1.5 bg-surface-2 border border-border rounded-full overflow-hidden">
        <div
          className="h-full bg-amber transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function BatchUploadForm() {
  const { selectedChain } = useChain();
  const { connected, address } = useWalletUnified();
  const isSolana = selectedChain?.type === 'solana';

  const [step, setStep] = useState(0);
  const [items, setItems] = useState<NFTItem[]>([]);
  const [collectionId, setCollectionId] = useState('');

  const [config, setConfig] = useState<CollectionConfig>({
    name: '',
    symbol: '',
    description: '',
    maxSupply: '',
    mintPrice: '0.01',
    royalty: '5',
  });

  const [uploading, setUploading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);

  // ── Dropzone ─────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    const newItems: NFTItem[] = accepted.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      description: '',
      attributes: [],
      status: 'pending',
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxSize: 50 * 1024 * 1024,
  });

  const updateItem = (id: string, updates: Partial<NFTItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // ── Apply name template to all items (e.g. "My NFT #1", "My NFT #2") ───
  const applyNameTemplate = (template: string) => {
    setItems((prev) =>
      prev.map((item, i) => ({
        ...item,
        name: template.replace('{n}', String(i + 1)).replace('{N}', String(i + 1).padStart(3, '0')),
      }))
    );
  };

  // ── Step 0 → 1: validate items ───────────────────────────────────────────
  const handleContinueToConfig = () => {
    if (items.length === 0) return toast.error('Add at least one image');
    setStep(1);
  };

  // ── Step 1 → 2: upload all items to Shelby ───────────────────────────────
  const handleUploadAll = async () => {
    if (!config.name.trim()) return toast.error('Collection name is required');
    if (!config.symbol.trim()) return toast.error('Symbol is required');
    if (!selectedChain) return toast.error('Select a chain first');

    const newCollectionId = `${config.symbol.toLowerCase()}-${Date.now()}`;
    setCollectionId(newCollectionId);
    setUploading(true);
    setStep(2);

    let allOk = true;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      updateItem(item.id, { status: 'uploading' });

      try {
        const formData = new FormData();
        formData.append('image', item.file);
        formData.append('name', item.name || `${config.name} #${i + 1}`);
        formData.append(
          'description',
          item.description || config.description || `${config.name} NFT #${i + 1}`
        );
        formData.append('collectionId', newCollectionId);
        formData.append('index', String(i + 1));
        if (item.attributes.length > 0) {
          formData.append('attributes', JSON.stringify(item.attributes));
        }

        const res = await nftApi.uploadMetadata(formData);
        updateItem(item.id, {
          status: 'done',
          metadataShelbyUri: res.metadataShelbyUri,
        });
      } catch (err: any) {
        allOk = false;
        updateItem(item.id, {
          status: 'error',
          error: err?.response?.data?.details || err.message || 'Upload failed',
        });
      }
    }

    setUploading(false);

    if (allOk) {
      toast.success(`All ${items.length} NFTs uploaded to Shelby!`);
    } else {
      toast.error('Some uploads failed — check the items list');
    }
  };

  // ── Step 2 → 3: deploy contract ──────────────────────────────────────────
  const handleDeploy = async () => {
    const doneItems = items.filter((i) => i.status === 'done');
    if (doneItems.length === 0) return toast.error('No successfully uploaded NFTs');
    if (!selectedChain) return toast.error('Select a chain first');

    setDeploying(true);
    const toastId = toast.loading(`Deploying on ${selectedChain.name}...`);

    try {
      // Use the first item's URI as the base token URI for the collection
      const baseTokenURI = doneItems[0].metadataShelbyUri || '';

      const res = await nftApi.deploy({
        name: config.name,
        symbol: config.symbol.toUpperCase(),
        description: config.description,
        maxSupply: parseInt(config.maxSupply || String(items.length), 10),
        mintPrice: config.mintPrice,
        royaltyPercentage: parseFloat(config.royalty),
        chain: selectedChain.id,
        baseTokenURI,
      });

      setDeployResult(res.deployment);
      // Persist so Collections page can list it
      if (typeof window !== 'undefined') {
        const KEY = 'nft_foundry_collections';
        const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
        const entry = {
          ...res.deployment,
          name: config.name,
          symbol: config.symbol.toUpperCase(),
          metadataShelbyUri: baseTokenURI,
        };
        localStorage.setItem(KEY, JSON.stringify([entry, ...existing.filter((c: any) => c.contractAddress !== entry.contractAddress)]));
      }
      toast.success('Collection deployed!', { id: toastId });
      setStep(3);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.details || err.message || 'Deploy failed',
        { id: toastId }
      );
    } finally {
      setDeploying(false);
    }
  };

  const explorerBase = selectedChain?.explorerUrl || '';
  const doneCount = items.filter((i) => i.status === 'done').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <StepIndicator
        steps={['Select Images', 'Configure', 'Upload to Shelby', 'Deployed']}
        current={step}
      />

      {!connected && (
        <div className="flex items-center gap-3 p-4 bg-amber-glow border border-amber-dim/30 rounded">
          <span className="text-amber text-lg">⚡</span>
          <p className="text-sm font-mono text-amber">
            Connect your wallet to continue
          </p>
        </div>
      )}

      {/* ── STEP 0: Select Images ──────────────────────────────────────── */}
      {step === 0 && (
        <Card bracket className="animate-fade-up">
          <SectionHeader
            step="01"
            title="Select Collection Images"
            subtitle="Drop all your NFT images at once. You can edit names and metadata per item."
          />

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={clsx(
              'border-2 border-dashed rounded-lg py-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200',
              isDragActive
                ? 'border-amber bg-amber-glow'
                : 'border-border hover:border-amber-dim hover:bg-surface-2'
            )}
          >
            <input {...getInputProps()} />
            <Upload size={28} className={isDragActive ? 'text-amber' : 'text-muted'} />
            <div className="text-center">
              <p className="text-sm font-mono text-dim">
                {isDragActive
                  ? 'Drop all images here'
                  : 'Drag & drop your NFT images here'}
              </p>
              <p className="text-xs text-muted font-mono mt-1">
                PNG, JPG, GIF, WEBP — multiple files supported
              </p>
            </div>
            <Button variant="secondary" size="sm">
              Browse Files
            </Button>
          </div>

          {/* Quick-fill name template */}
          {items.length > 0 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-surface-2 border border-border rounded">
              <span className="text-xs font-mono text-dim flex-shrink-0">
                Name template:
              </span>
              <input
                placeholder="My NFT #{n}  (use {n} for number, {N} for 001)"
                onBlur={(e) => e.target.value && applyNameTemplate(e.target.value)}
                className="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-amber-dim"
              />
              <span className="text-xs text-muted font-mono">{items.length} files</span>
            </div>
          )}

          {/* Item list */}
          {items.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
              {items.map((item, i) => (
                <NFTItemEditor
                  key={item.id}
                  item={item}
                  index={i}
                  onChange={updateItem}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}

          <Divider />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted">
              {items.length} image{items.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              onClick={handleContinueToConfig}
              disabled={!connected || items.length === 0}
            >
              Configure Collection
              <ChevronRight size={14} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 1: Collection Config ──────────────────────────────────── */}
      {step === 1 && (
        <Card bracket className="animate-fade-up">
          <SectionHeader
            step="02"
            title="Collection Configuration"
            subtitle="Set the on-chain parameters for your collection contract"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Collection Name"
              placeholder="My Collection"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
            />
            <Input
              label="Token Symbol"
              placeholder="MYCOL"
              value={config.symbol}
              onChange={(e) =>
                setConfig({ ...config, symbol: e.target.value.toUpperCase().slice(0, 10) })
              }
            />
            <Input
              label="Max Supply"
              type="number"
              placeholder={String(items.length)}
              value={config.maxSupply}
              onChange={(e) => setConfig({ ...config, maxSupply: e.target.value })}
              hint={`Leave blank to use ${items.length} (your image count)`}
            />
            <Input
              label="Mint Price"
              type="number"
              min="0"
              step="0.001"
              value={config.mintPrice}
              onChange={(e) => setConfig({ ...config, mintPrice: e.target.value })}
              suffix={selectedChain?.nativeCurrency.symbol || 'ETH'}
            />
            <Input
              label="Royalty %"
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={config.royalty}
              onChange={(e) => setConfig({ ...config, royalty: e.target.value })}
              suffix="%"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-dim">
                Chain
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded">
                <span className="text-amber">{isSolana ? '◎' : '⟠'}</span>
                <span className="text-sm font-mono text-text">{selectedChain?.name}</span>
                <Badge variant="amber" className="ml-auto">
                  {selectedChain?.network}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Textarea
              label="Collection Description"
              placeholder="A collection of..."
              rows={2}
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
            />
          </div>

          <Divider />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(0)}
              className="text-xs font-mono text-muted hover:text-dim transition-colors"
            >
              ← Back
            </button>
            <Button onClick={handleUploadAll} disabled={!connected}>
              <Upload size={14} />
              Upload {items.length} NFTs to Shelby
            </Button>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Upload progress ───────────────────────────────────── */}
      {step === 2 && (
        <Card bracket className="animate-fade-up">
          <SectionHeader
            step="03"
            title="Uploading to Shelby"
            subtitle={
              uploading
                ? 'Uploading NFT images and metadata to Shelby Protocol...'
                : 'Upload complete — review results below'
            }
          />

          <UploadProgress items={items} />

          <div className="mt-4 flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {items.map((item, i) => (
              <NFTItemEditor
                key={item.id}
                item={item}
                index={i}
                onChange={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>

          {!uploading && (
            <>
              <Divider />
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-dim">
                  {doneCount} uploaded
                  {errorCount > 0 && (
                    <span className="text-red-400 ml-2">{errorCount} failed</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {errorCount > 0 && (
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        // Retry failed items
                        const failed = items.filter((i) => i.status === 'error');
                        for (const item of failed) {
                          updateItem(item.id, { status: 'uploading', error: undefined });
                          try {
                            const formData = new FormData();
                            formData.append('image', item.file);
                            formData.append('name', item.name);
                            formData.append('description', item.description);
                            formData.append('collectionId', collectionId);
                            const res = await nftApi.uploadMetadata(formData);
                            updateItem(item.id, {
                              status: 'done',
                              metadataShelbyUri: res.metadataShelbyUri,
                            });
                          } catch (err: any) {
                            updateItem(item.id, {
                              status: 'error',
                              error: err.message,
                            });
                          }
                        }
                      }}
                    >
                      Retry Failed
                    </Button>
                  )}
                  <Button
                    onClick={handleDeploy}
                    loading={deploying}
                    disabled={doneCount === 0}
                  >
                    <Rocket size={14} />
                    Deploy Collection
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── STEP 3: Success ───────────────────────────────────────────── */}
      {step === 3 && deployResult && (
        <Card bracket className="animate-fade-up border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-sm bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <span className="text-green-400 text-base">✓</span>
            </div>
            <div>
              <h2 className="font-display text-2xl text-green-400">
                Collection Deployed
              </h2>
              <p className="text-xs text-dim font-mono">
                {doneCount} NFTs on Shelby · {new Date(deployResult.deployedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-5">
            <ResultBox
              label="Contract Address"
              value={deployResult.contractAddress}
              href={
                explorerBase
                  ? `${explorerBase}/address/${deployResult.contractAddress}`
                  : undefined
              }
            />
            <ResultBox
              label="Transaction Hash"
              value={deployResult.transactionHash}
              href={
                explorerBase
                  ? `${explorerBase}/tx/${deployResult.transactionHash}`
                  : undefined
              }
            />
            <ResultBox label="Chain" value={deployResult.chain.toUpperCase()} mono={false} />
          </div>

          {/* Shelby URIs accordion */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-3 bg-surface-2 border border-border rounded text-xs font-mono text-dim hover:text-text transition-colors">
              <span>View all {doneCount} Shelby URIs</span>
              <ChevronDown
                size={12}
                className="group-open:rotate-180 transition-transform"
              />
            </summary>
            <div className="mt-2 flex flex-col gap-1 max-h-48 overflow-y-auto p-2 bg-surface-2 border border-border rounded">
              {items
                .filter((i) => i.status === 'done')
                .map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 py-1">
                    <span className="text-xs font-mono text-muted w-8">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-mono text-dim truncate flex-1">
                      {item.metadataShelbyUri}
                    </span>
                  </div>
                ))}
            </div>
          </details>

          <Divider />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setStep(0);
                setItems([]);
                setDeployResult(null);
                setConfig({
                  name: '',
                  symbol: '',
                  description: '',
                  maxSupply: '',
                  mintPrice: '0.01',
                  royalty: '5',
                });
              }}
            >
              Deploy Another
            </Button>
            <Button
              onClick={() =>
                (window.location.href = `/mint?contract=${deployResult.contractAddress}&chain=${selectedChain?.id}`)
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