/**
 * pages/mint.tsx — Mint page
 */

import Head from 'next/head';
import Navbar from '../components/Navbar';
import MintForm from '../components/MintForm';

export default function MintPage() {
  return (
    <>
      <Head>
        <title>NFT Foundry — Mint NFT</title>
        <meta name="description" content="Mint NFTs into an existing collection" />
      </Head>

      <div className="min-h-screen bg-bg">
        <Navbar />

        <main className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-8 bg-amber opacity-60" />
              <span className="text-xs font-mono text-amber uppercase tracking-widest">
                Mint
              </span>
            </div>
            <h1 className="font-display text-5xl text-text">
              MINT AN <span className="text-amber">NFT</span>
            </h1>
            <p className="text-sm text-dim font-body mt-2 max-w-lg">
              Upload your NFT media to Shelby, then mint it into any deployed collection.
              The Shelby URI is stored permanently on-chain.
            </p>
          </div>

          <MintForm />
        </main>
      </div>
    </>
  );
}