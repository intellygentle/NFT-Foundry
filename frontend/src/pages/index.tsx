/**
 * pages/index.tsx — Deploy page (home)
 */

import Head from 'next/head';
import Navbar from '../components/Navbar';
import DeployForm from '../components/DeployForm';
import { Zap, Database, Globe } from 'lucide-react';

const FEATURES = [
  {
    icon: '⟠',
    title: 'Multi-Chain',
    desc: 'Deploy to Ethereum, Polygon, Solana and more with one unified interface',
  },
  {
    icon: '◈',
    title: 'Shelby Storage',
    desc: 'NFT metadata stored permanently and decentrally on Shelby Protocol',
  },
  {
    icon: '⚡',
    title: 'Plug & Play',
    desc: 'Connect wallet, fill the form, deploy — no coding required',
  },
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>NFT Foundry — Deploy NFT Collections</title>
        <meta
          name="description"
          content="Multi-chain NFT deployment platform with Shelby decentralized storage"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-bg">
        <Navbar />

        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* ── Hero ───────────────────────────────────────────────────── */}
          <section className="mb-12 animate-fade-up">
            {/* Grid background accent */}
            <div
              className="absolute left-0 right-0 h-64 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px w-8 bg-amber opacity-60" />
                <span className="text-xs font-mono text-amber uppercase tracking-widest">
                  Shelbynet Testnet
                </span>
              </div>
              <h1 className="font-display text-6xl md:text-7xl text-text leading-none mb-4">
                FORGE YOUR
                <br />
                <span className="text-amber">NFT COLLECTION</span>
              </h1>
              <p className="text-base text-dim font-body max-w-xl leading-relaxed">
                Deploy NFT collections across multiple chains. All metadata stored permanently
                on{' '}
                <a
                  href="https://shelby.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber underline underline-offset-2"
                >
                  Shelby Protocol
                </a>{' '}
                — censorship-resistant, decentralized, built on Aptos.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-3 mt-5">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded text-sm"
                  >
                    <span className="text-amber">{f.icon}</span>
                    <span className="font-mono text-dim">{f.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Deploy Form ────────────────────────────────────────────── */}
          <section className="animate-fade-up stagger-2">
            <DeployForm />
          </section>
        </main>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="border-t border-border mt-16">
          <div className="max-w-5xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border border-amber flex items-center justify-center">
                <Zap size={10} className="text-amber fill-amber" />
              </div>
              <span className="font-display text-sm tracking-widest text-dim uppercase">
                NFT Foundry
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-muted">
              <a
                href="https://docs.shelby.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber transition-colors"
              >
                Shelby Docs
              </a>
              <a
                href="https://geomi.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber transition-colors"
              >
                Get API Key
              </a>
              <a
                href="https://github.com/shelby/examples"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}