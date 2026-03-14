/**
 * components/Navbar.tsx
 *
 * Top navigation with:
 *  - NFT Foundry logo/wordmark
 *  - Chain selector (shows EVM or Solana wallet connect based on selection)
 *  - Wallet connect button
 *  - Shelby status indicator
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useChain } from '../context/ChainContext';
import { shelbyApi } from '../lib/api';
import { ChevronDown, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

// ── Chain icon map ─────────────────────────────────────────────────────────
const CHAIN_ICONS: Record<string, string> = {
  sepolia: '⟠',
  'polygon-mumbai': '⬡',
  'solana-devnet': '◎',
};

// ── Shelby status dot ──────────────────────────────────────────────────────
function ShelbyDot() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    shelbyApi
      .getStatus()
      .then((s) => setStatus(s.status === 'connected' ? 'ok' : 'error'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-border rounded text-xs font-mono">
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full',
          status === 'loading' && 'bg-text-muted',
          status === 'ok' && 'bg-green-500 animate-pulse-amber',
          status === 'error' && 'bg-red-500'
        )}
      />
      <span className="text-muted">SHELBY</span>
    </div>
  );
}

// ── Chain selector dropdown ────────────────────────────────────────────────
function ChainSelector() {
  const { chains, selectedChain, setSelectedChain, loading } = useChain();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (loading || !selectedChain) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 text-sm font-mono',
          'bg-surface-2 border border-border hover:border-amber-dim',
          'rounded transition-colors duration-150',
          open && 'border-amber-dim'
        )}
      >
        <span className="text-amber">{CHAIN_ICONS[selectedChain.id] || '○'}</span>
        <span className="text-text">{selectedChain.name}</span>
        <span className="text-xs font-mono text-muted bg-surface px-1 rounded">
          {selectedChain.network.toUpperCase()}
        </span>
        <ChevronDown
          size={12}
          className={clsx(
            'text-dim transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-surface border border-border rounded shadow-xl z-50 animate-fade-in">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-mono text-muted uppercase tracking-widest px-2 py-1">
              Select Network
            </p>
          </div>
          <div className="p-1">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  setSelectedChain(chain);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-left',
                  'hover:bg-surface-2 transition-colors duration-100',
                  selectedChain.id === chain.id &&
                    'bg-amber-glow text-amber'
                )}
              >
                <span className="text-base">{CHAIN_ICONS[chain.id] || '○'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium truncate">{chain.name}</p>
                  <p className="text-xs text-muted font-mono">{chain.type.toUpperCase()}</p>
                </div>
                {selectedChain.id === chain.id && (
                  <CheckCircle2 size={12} className="text-amber flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Solana wallet button ───────────────────────────────────────────────────
function SolanaWalletButton() {
  const { connected, publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (connecting) {
    return (
      <button className="flex items-center gap-2 px-4 py-1.5 bg-surface-2 border border-border rounded text-sm font-mono text-dim cursor-wait">
        <span className="w-3 h-3 border border-amber border-t-transparent rounded-full animate-spin" />
        Connecting...
      </button>
    );
  }

  if (connected && publicKey) {
    const addr = publicKey.toBase58();
    const short = `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border rounded text-sm font-mono text-text">
          <span className="text-amber">◎</span>
          {short}
        </div>
        <button
          onClick={disconnect}
          className="px-2 py-1.5 text-xs font-mono text-muted hover:text-red-400 transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className={clsx(
        'px-4 py-1.5 text-sm font-mono font-medium',
        'bg-amber text-black rounded',
        'hover:bg-amber-dim transition-colors duration-150'
      )}
    >
      Connect Wallet
    </button>
  );
}

// ── Main Navbar ────────────────────────────────────────────────────────────
export default function Navbar() {
  const { selectedChain } = useChain();
  const router = useRouter();
  const isSolana = selectedChain?.type === 'solana';

  const navLinks = [
    { href: '/', label: 'Deploy' },
    { href: '/batch', label: 'Batch' },
    { href: '/mint', label: 'Mint' },
    { href: '/collections', label: 'Collections' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-sm">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber to-transparent opacity-60" />

      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 border border-amber flex items-center justify-center">
            <Zap size={12} className="text-amber fill-amber" />
          </div>
          <span className="font-display text-xl tracking-widest text-text uppercase">
            NFT Foundry
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'px-3 py-1 text-sm font-mono transition-colors duration-150 rounded',
                router.pathname === link.href
                  ? 'text-amber bg-amber-glow'
                  : 'text-dim hover:text-text'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <ShelbyDot />
          <ChainSelector />
          {isSolana ? (
            <SolanaWalletButton />
          ) : (
            <ConnectButton
              accountStatus="address"
              chainStatus="none"
              showBalance={false}
            />
          )}
        </div>
      </div>
    </header>
  );
}