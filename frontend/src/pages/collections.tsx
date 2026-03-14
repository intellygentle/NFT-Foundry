/**
 * pages/collections.tsx
 *
 * Lists collections the connected wallet has deployed.
 * Uses localStorage to persist deployments from this session.
 * In production you'd index these from the blockchain.
 */

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { Card, Badge, Button } from '../components/ui';
import { useChain } from '../context/ChainContext';
import { ExternalLink, Copy, Hammer } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface SavedCollection {
  contractAddress: string;
  transactionHash: string;
  chain: string;
  name: string;
  symbol: string;
  deployedAt: string;
  metadataShelbyUri?: string;
}

const STORAGE_KEY = 'nft_foundry_collections';

function saveCollection(col: SavedCollection) {
  const existing: SavedCollection[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || '[]'
  );
  // Deduplicate by contractAddress
  const updated = [
    col,
    ...existing.filter((c) => c.contractAddress !== col.contractAddress),
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getCollections(): SavedCollection[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

// ── Collection card ────────────────────────────────────────────────────────
function CollectionCard({ col }: { col: SavedCollection }) {
  const { chains } = useChain();
  const chain = chains.find((c) => c.id === col.chain);

  const explorerBase = chain?.explorerUrl || '';

  const copyAddr = () => {
    navigator.clipboard.writeText(col.contractAddress);
    toast.success('Address copied');
  };

  return (
    <Card className="hover:border-amber-dim/50 transition-colors duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-display text-xl text-text tracking-wide">
            {col.name || 'Unnamed Collection'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="amber">{col.symbol || '—'}</Badge>
            <Badge variant="default">{col.chain}</Badge>
          </div>
        </div>
        <span className="text-xs font-mono text-muted">
          {new Date(col.deployedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="p-2.5 bg-surface-2 border border-border rounded flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-mono text-dim truncate">
          {col.contractAddress}
        </span>
        <button
          onClick={copyAddr}
          className="text-muted hover:text-amber transition-colors flex-shrink-0"
        >
          <Copy size={12} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {explorerBase && (
          <a
            href={`${explorerBase}/address/${col.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm">
              <ExternalLink size={12} />
              Explorer
            </Button>
          </a>
        )}
        <Link href={`/collection/${col.contractAddress}?chain=${col.chain}`}>
          <Button variant="ghost" size="sm">
            View →
          </Button>
        </Link>
        <Link href={`/mint?contract=${col.contractAddress}&chain=${col.chain}`}>
          <Button variant="secondary" size="sm">
            <Hammer size={12} />
            Mint
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [filterChain, setFilterChain] = useState<string>('all');
  const { chains } = useChain();

  useEffect(() => {
    setCollections(getCollections());
  }, []);

  const filtered =
    filterChain === 'all'
      ? collections
      : collections.filter((c) => c.chain === filterChain);

  return (
    <>
      <Head>
        <title>NFT Foundry — My Collections</title>
      </Head>

      <div className="min-h-screen bg-bg">
        <Navbar />

        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-8 bg-amber opacity-60" />
              <span className="text-xs font-mono text-amber uppercase tracking-widest">
                Collections
              </span>
            </div>
            <h1 className="font-display text-5xl text-text">
              MY <span className="text-amber">COLLECTIONS</span>
            </h1>
            <p className="text-sm text-dim font-body mt-2">
              Collections deployed from this browser session
            </p>
          </div>

          {/* Chain filter */}
          <div className="flex flex-wrap gap-2 mb-6 animate-fade-up stagger-1">
            {['all', ...chains.map((c) => c.id)].map((chainId) => (
              <button
                key={chainId}
                onClick={() => setFilterChain(chainId)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-mono rounded border transition-all',
                  filterChain === chainId
                    ? 'bg-amber-glow border-amber-dim text-amber'
                    : 'bg-surface-2 border-border text-muted hover:border-amber-dim hover:text-dim'
                )}
              >
                {chainId === 'all'
                  ? 'All Chains'
                  : chains.find((c) => c.id === chainId)?.name || chainId}
              </button>
            ))}
          </div>

          {/* Collections grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-up stagger-2">
              <div className="w-16 h-16 border border-border flex items-center justify-center rounded-lg">
                <span className="text-3xl text-muted">◈</span>
              </div>
              <p className="text-dim font-mono text-sm">No collections found</p>
              <Link href="/">
                <Button variant="secondary">Deploy your first collection →</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((col) => (
                <CollectionCard key={col.contractAddress} col={col} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}