/**
 * pages/_app.tsx
 *
 * FIX: RainbowKit and Solana wallet adapters access localStorage and other
 * browser APIs during initialisation. Next.js runs _app.tsx on the server
 * during SSR, where localStorage doesn't exist → TypeError crash.
 *
 * Solution: extract all wallet providers into a separate component
 * and load it with next/dynamic + { ssr: false } so it only ever
 * runs in the browser.
 */

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';

import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';

// ── All wallet + query providers in one client-only component ──────────────
// This file is ONLY imported on the client (ssr: false), so localStorage,
// window, and other browser APIs are safe to use inside it.

const WalletProviders = dynamic(
  () => import('../components/WalletProviders'),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProviders>
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111114',
            color: '#e8e8f0',
            border: '1px solid #2a2a32',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            borderRadius: '4px',
          },
          success: {
            iconTheme: { primary: '#f59e0b', secondary: '#000' },
          },
        }}
      />
    </WalletProviders>
  );
}