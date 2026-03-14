/**
 * components/WalletProviders.tsx
 *
 * All wallet and query providers that require browser APIs (localStorage,
 * window, navigator, etc.). This component is loaded dynamically with
 * { ssr: false } in _app.tsx so it never runs during server-side rendering.
 *
 * Safe to use: localStorage, sessionStorage, window, navigator, crypto
 */

import { ReactNode, useMemo } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import { wagmiConfig } from '../lib/wagmi';
import { ChainProvider } from '../context/ChainContext';

// QueryClient lives outside the component so it's not recreated on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

interface WalletProvidersProps {
  children: ReactNode;
}

export default function WalletProviders({ children }: WalletProvidersProps) {
  const solanaEndpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      clusterApiUrl('devnet'),
    []
  );

  const solanaWallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#f59e0b',
            accentColorForeground: '#000',
            borderRadius: 'small',
            fontStack: 'system',
          })}
        >
          <ConnectionProvider endpoint={solanaEndpoint}>
            <WalletProvider wallets={solanaWallets} autoConnect>
              <WalletModalProvider>
                <ChainProvider>
                  {children}
                </ChainProvider>
              </WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}