/**
 * hooks/useWalletUnified.ts
 *
 * A single hook that normalises EVM (wagmi) and Solana wallet state.
 * Components use this instead of calling useAccount() + useWallet() separately
 * and conditionally branching on chain type everywhere.
 *
 * Usage:
 *   const { connected, address, chainType, shortAddress } = useWalletUnified();
 */

import { useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useChain } from '../context/ChainContext';

export interface UnifiedWallet {
  /** Is a wallet connected for the currently selected chain? */
  connected: boolean;
  /** Full address string (0x... for EVM, base58 for Solana) */
  address: string | undefined;
  /** Shortened address for display: 0x1234...abcd */
  shortAddress: string | undefined;
  /** Which type the currently selected chain is */
  chainType: 'evm' | 'solana' | undefined;
  /** Sign a message with the connected wallet. Returns hex/base64 signature. */
  signMessage: ((message: string) => Promise<string>) | undefined;
}

function shorten(addr: string | undefined): string | undefined {
  if (!addr) return undefined;
  if (addr.startsWith('0x')) return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function useWalletUnified(): UnifiedWallet {
  const { selectedChain } = useChain();
  const chainType = selectedChain?.type;

  // EVM (wagmi)
  const { address: evmAddress, isConnected: evmConnected } = useAccount();

  // Solana
  const {
    publicKey: solanaKey,
    connected: solanaConnected,
    signMessage: solanaSignMessage,
  } = useWallet();

  if (chainType === 'solana') {
    const address = solanaKey?.toBase58();

    const signMessage = solanaConnected && solanaSignMessage
      ? async (message: string): Promise<string> => {
          const encoded = new TextEncoder().encode(message);
          const sig = await solanaSignMessage(encoded);
          return Buffer.from(sig).toString('base64');
        }
      : undefined;

    return {
      connected: solanaConnected,
      address,
      shortAddress: shorten(address),
      chainType: 'solana',
      signMessage,
    };
  }

  // Default: EVM
  const signMessage = evmConnected
    ? undefined // wagmi signMessage needs useSignMessage hook — handled separately where needed
    : undefined;

  return {
    connected: evmConnected,
    address: evmAddress,
    shortAddress: shorten(evmAddress),
    chainType: 'evm',
    signMessage,
  };
}