/**
 * pages/collection/[address].tsx
 *
 * Displays on-chain info about a deployed collection:
 *  - Name, symbol, supply, mint price, public mint status
 *  - Base URI (Shelby URI)
 *  - A quick-mint panel if public minting is enabled
 *  - Links to explorer
 *
 * URL: /collection/0xABC123?chain=sepolia
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import MintForm from '../../components/MintForm';
import { Card, Badge, Button, ResultBox, Divider } from '../../components/ui';
import { nftApi } from '../../lib/api';
import { ShelbyService } from '../../lib/shelbyUtils';
import { useChain } from '../../context/ChainContext';
import { ArrowLeft, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface CollectionInfo {
  contractAddress: string;
  chain: string;
  name: string;
  symbol: string;
  totalSupply: string;
  maxSupply: string;
  mintPrice: string;
  mintPriceRaw: string;
  publicMintEnabled: boolean;
  baseTokenURI: string;
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-1 p-4 border rounded-lg',
        accent
          ? 'bg-amber-glow border-amber-dim/40'
          : 'bg-surface-2 border-border'
      )}
    >
      <span className="text-xs font-mono uppercase tracking-widest text-muted">
        {label}
      </span>
      <span
        className={clsx(
          'font-display text-3xl leading-none',
          accent ? 'text-amber' : 'text-text'
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs font-mono text-muted mt-0.5">{sub}</span>}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────

function SupplyBar({
  total,
  max,
}: {
  total: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((total / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs font-mono text-muted">
        <span>Supply minted</span>
        <span>
          {total.toLocaleString()} / {max.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-surface-2 border border-border rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            pct >= 100 ? 'bg-red-500' : pct > 75 ? 'bg-amber' : 'bg-green-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CollectionDetailPage() {
  const router = useRouter();
  const { address } = router.query;
  const chainId = (router.query.chain as string) || 'sepolia';

  const { chains, setSelectedChain } = useChain();
  const [info, setInfo] = useState<CollectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMint, setShowMint] = useState(false);

  // Set chain context to match URL param
  useEffect(() => {
    if (chainId && chains.length > 0) {
      const chain = chains.find((c) => c.id === chainId);
      if (chain) setSelectedChain(chain);
    }
  }, [chainId, chains]);

  const loadInfo = async () => {
    if (!address || typeof address !== 'string') return;
    setLoading(true);
    setError(null);
    try {
      const data = await nftApi.getCollectionInfo(chainId, address);
      setInfo(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.details ||
          err?.response?.data?.error ||
          err.message ||
          'Failed to load collection'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfo();
  }, [address, chainId]);

  const chain = chains.find((c) => c.id === chainId);
  const explorerBase = chain?.explorerUrl || '';
  const explorerUrl = explorerBase
    ? `${explorerBase}/address/${address}`
    : '#';

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address as string);
      toast.success('Address copied');
    }
  };

  // Convert shelby:// baseTokenURI to HTTP gateway URL
  const metadataHttpUrl =
    info?.baseTokenURI?.startsWith('shelby://')
      ? `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${info.baseTokenURI.replace('shelby://', '')}`
      : info?.baseTokenURI;

  return (
    <>
      <Head>
        <title>
          {info ? `${info.name} — NFT Foundry` : 'Collection — NFT Foundry'}
        </title>
      </Head>

      <div className="min-h-screen bg-bg">
        <Navbar />

        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* Back link */}
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-xs font-mono text-muted hover:text-amber transition-colors mb-6"
          >
            <ArrowLeft size={12} />
            Back to Collections
          </Link>

          {/* ── Loading ─────────────────────────────────────────────────── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-muted">
                Reading chain data...
              </p>
            </div>
          )}

          {/* ── Error ───────────────────────────────────────────────────── */}
          {!loading && error && (
            <Card className="border-red-500/30 bg-red-500/5">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-lg flex-shrink-0">✕</span>
                <div className="flex-1">
                  <p className="text-sm font-mono text-red-400 font-medium">
                    Failed to load collection
                  </p>
                  <p className="text-xs font-mono text-muted mt-1">{error}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={loadInfo}>
                  <RefreshCw size={12} />
                  Retry
                </Button>
              </div>
            </Card>
          )}

          {/* ── Content ─────────────────────────────────────────────────── */}
          {!loading && info && (
            <div className="flex flex-col gap-6 animate-fade-up">
              {/* Header */}
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="font-display text-5xl text-text leading-none">
                      {info.name.toUpperCase()}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="amber">{info.symbol}</Badge>
                      <Badge variant="default">{info.chain}</Badge>
                      <Badge variant={info.publicMintEnabled ? 'green' : 'default'}>
                        {info.publicMintEnabled ? 'Mint Open' : 'Mint Closed'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={copyAddress}>
                      <Copy size={12} />
                      Copy Address
                    </Button>
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" size="sm">
                        <ExternalLink size={12} />
                        Explorer
                      </Button>
                    </a>
                    <Button variant="ghost" size="sm" onClick={loadInfo}>
                      <RefreshCw size={12} />
                    </Button>
                  </div>
                </div>

                {/* Contract address */}
                <div className="flex items-center gap-2 text-xs font-mono text-muted">
                  <span
                    className={clsx(
                      'w-1.5 h-1.5 rounded-full',
                      chain?.type === 'evm' ? 'bg-blue-400' : 'bg-purple-400'
                    )}
                  />
                  {address}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Total Minted"
                  value={parseInt(info.totalSupply).toLocaleString()}
                  accent
                />
                <StatCard
                  label="Max Supply"
                  value={parseInt(info.maxSupply).toLocaleString()}
                />
                <StatCard
                  label="Mint Price"
                  value={parseFloat(info.mintPrice).toFixed(4)}
                  sub={chain?.nativeCurrency.symbol || 'ETH'}
                />
                <StatCard
                  label="Remaining"
                  value={(
                    parseInt(info.maxSupply) - parseInt(info.totalSupply)
                  ).toLocaleString()}
                  sub="available to mint"
                />
              </div>

              {/* Supply bar */}
              <Card>
                <SupplyBar
                  total={parseInt(info.totalSupply)}
                  max={parseInt(info.maxSupply)}
                />
              </Card>

              {/* Storage info */}
              <Card>
                <p className="text-xs font-mono uppercase tracking-widest text-muted mb-3">
                  Storage
                </p>
                <ResultBox
                  label="Base Token URI (Shelby)"
                  value={info.baseTokenURI}
                />
                {metadataHttpUrl && info.baseTokenURI.startsWith('shelby://') && (
                  <div className="mt-2">
                    <ResultBox
                      label="HTTP Gateway URL"
                      value={metadataHttpUrl}
                      href={metadataHttpUrl}
                    />
                  </div>
                )}
              </Card>

              {/* Mint section */}
              <Card
                className={clsx(
                  'transition-all duration-200',
                  !info.publicMintEnabled && 'opacity-70'
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-display text-xl text-text">Mint an NFT</p>
                    <p className="text-xs font-mono text-muted mt-0.5">
                      {info.publicMintEnabled
                        ? `Public mint is open — ${parseFloat(info.mintPrice).toFixed(4)} ${chain?.nativeCurrency.symbol || 'ETH'} per NFT`
                        : 'Public mint is currently closed for this collection'}
                    </p>
                  </div>
                  <Button
                    variant={showMint ? 'ghost' : 'primary'}
                    size="sm"
                    onClick={() => setShowMint(!showMint)}
                    disabled={!info.publicMintEnabled}
                  >
                    {showMint ? 'Collapse ↑' : 'Mint Here →'}
                  </Button>
                </div>

                {showMint && (
                  <div className="border-t border-border pt-4">
                    <MintForm />
                  </div>
                )}
              </Card>
            </div>
          )}
        </main>
      </div>
    </>
  );
}