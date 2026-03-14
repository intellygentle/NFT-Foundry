/**
 * context/ChainContext.tsx
 *
 * Provides:
 *  - selectedChain: the chain the user has chosen (e.g. "sepolia", "solana-devnet")
 *  - setSelectedChain
 *  - chains: list of supported chains from the backend
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { nftApi, ChainInfo } from '../lib/api';

interface ChainContextValue {
  chains: ChainInfo[];
  selectedChain: ChainInfo | null;
  setSelectedChain: (chain: ChainInfo) => void;
  loading: boolean;
}

const ChainContext = createContext<ChainContextValue>({
  chains: [],
  selectedChain: null,
  setSelectedChain: () => {},
  loading: true,
});

export function ChainProvider({ children }: { children: ReactNode }) {
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [selectedChain, setSelectedChain] = useState<ChainInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    nftApi
      .getChains()
      .then((data) => {
        setChains(data);
        setSelectedChain(data[0] ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ChainContext.Provider
      value={{ chains, selectedChain, setSelectedChain, loading }}
    >
      {children}
    </ChainContext.Provider>
  );
}

export function useChain() {
  return useContext(ChainContext);
}