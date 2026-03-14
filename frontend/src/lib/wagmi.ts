/**
 * lib/wagmi.ts
 *
 * Wagmi v2 + RainbowKit v2 configuration.
 * Supported EVM chains: Ethereum Sepolia, Polygon Mumbai.
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, polygonMumbai } from 'wagmi/chains';

// WalletConnect project ID — get one free at https://cloud.walletconnect.com
const PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const wagmiConfig = getDefaultConfig({
  appName: 'NFT Foundry',
  projectId: PROJECT_ID,
  chains: [sepolia, polygonMumbai],
  ssr: true,
});

export { sepolia, polygonMumbai };