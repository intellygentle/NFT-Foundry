/**
 * components/WalletProviders.tsx
 *
 * All wallet and query providers that require browser APIs.
 * Loaded with { ssr: false } in _app.tsx.
 *
 * Provides:
 *  - EVM wallets via Wagmi + RainbowKit
 *  - Solana wallets via @solana/wallet-adapter
 *  - Aptos wallets via @aptos-labs/wallet-adapter-react (for Shelby signing)
 */

import { ReactNode, useMemo } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';

import { wagmiConfig } from '../lib/wagmi';
import { ChainProvider } from '../context/ChainContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

interface WalletProvidersProps {
  children: ReactNode;
}

export default function WalletProviders({ children }: WalletProvidersProps) {
  const solanaEndpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet'),
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
            <SolanaWalletProvider wallets={solanaWallets} autoConnect>
              <WalletModalProvider>
                {/* Aptos wallet adapter — used for Shelby upload signing */}
                <AptosWalletAdapterProvider
                  plugins={[]}
                  autoConnect={false}
                  onError={(error: Error) => {
                    console.warn('Aptos wallet error:', error);
                  }}
                >
                  <ChainProvider>
                    {children}
                  </ChainProvider>
                </AptosWalletAdapterProvider>
              </WalletModalProvider>
            </SolanaWalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}