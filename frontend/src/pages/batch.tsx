/**
 * pages/batch.tsx — Batch collection deployment page
 */

import Head from 'next/head';
import Navbar from '../components/Navbar';
import BatchUploadForm from '../components/BatchUploadForm';

export default function BatchPage() {
  return (
    <>
      <Head>
        <title>NFT Foundry — Batch Deploy Collection</title>
        <meta
          name="description"
          content="Upload and deploy an entire NFT collection at once"
        />
      </Head>

      <div className="min-h-screen bg-bg">
        <Navbar />

        <main className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px w-8 bg-amber opacity-60" />
              <span className="text-xs font-mono text-amber uppercase tracking-widest">
                Batch Deploy
              </span>
            </div>
            <h1 className="font-display text-5xl text-text leading-none">
              BATCH DEPLOY
              <br />
              <span className="text-amber">FULL COLLECTION</span>
            </h1>
            <p className="text-sm text-dim font-body mt-3 max-w-xl leading-relaxed">
              Drop all your NFT images at once. Edit metadata per item, then upload
              the entire collection to Shelby and deploy your contract in one flow.
            </p>
          </div>

          <BatchUploadForm />
        </main>
      </div>
    </>
  );
}