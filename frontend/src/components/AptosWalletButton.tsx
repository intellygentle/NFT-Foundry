/**
 * components/AptosWalletButton.tsx
 *
 * Aptos wallet connect button using @aptos-labs/wallet-adapter-react v3.
 * Used for signing Shelby blob upload transactions.
 * Petra and other installed Aptos wallets are auto-detected from browser extensions.
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import clsx from 'clsx';
import { ChevronDown, X } from 'lucide-react';

function shorten(addr: string): string {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AptosWalletButton() {
  const { connect, disconnect, account, connected, wallets } = useWallet();
  const [open, setOpen] = useState(false);

  // ── Connected state ──────────────────────────────────────────────────────
  if (connected && account) {
    // AccountAddress in Aptos SDK v5 — cast to any to get string safely
    const addr = String((account.address as any) ?? '');

    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-glow border border-amber-dim/40 rounded text-xs font-mono">
          <span className="text-amber font-bold text-sm">A</span>
          <span className="text-text">{shorten(addr)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-2 py-1.5 text-xs font-mono text-muted hover:text-red-400 transition-colors"
          title="Disconnect Aptos wallet"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  // ── Disconnected — show wallet picker ────────────────────────────────────
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 text-xs font-mono',
          'bg-surface-2 border border-border rounded',
          'hover:border-amber-dim transition-colors',
          open && 'border-amber-dim'
        )}
      >
        <span className="text-amber font-bold text-sm">A</span>
        <span className="text-dim">Aptos Wallet</span>
        <ChevronDown
          size={10}
          className={clsx('text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-52 bg-surface border border-border rounded shadow-xl z-50 animate-fade-in">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-mono text-muted px-2 py-1 uppercase tracking-widest">
              Select Aptos Wallet
            </p>
          </div>
          <div className="p-1">
            {wallets && wallets.length > 0 ? (
              wallets.map((wallet: any) => {
                const isReady =
                  wallet.readyState === 'Installed' ||
                  wallet.readyState === 'Loadable';
                return (
                  <button
                    key={wallet.name}
                    onClick={() => {
                      connect(wallet.name);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-left hover:bg-surface-2 transition-colors"
                  >
                    {wallet.icon && (
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        className="w-5 h-5 rounded"
                      />
                    )}
                    <span className="font-mono text-text flex-1">{wallet.name}</span>
                    {isReady ? (
                      <span className="text-xs text-green-400 font-mono">Ready</span>
                    ) : (
                      <span className="text-xs text-muted font-mono">Install</span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-xs font-mono text-muted">No Aptos wallets detected</p>
                <a
                  href="https://petra.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber underline mt-1 block"
                >
                  Install Petra Wallet →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}