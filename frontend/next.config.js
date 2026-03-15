/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Polyfills for wallet libs
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Stub out optional missing deps pulled in by @aptos-labs/wallet-adapter-react
    // These are optional wallet plugins (Telegram, MizuWallet, etc.) that aren't installed
    config.resolve.alias = {
      ...config.resolve.alias,
      '@telegram-apps/bridge': false,
      '@mizuwallet-sdk/core': false,
      'aptos': false,
    };

    // Suppress warnings from wallet libs
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    return config;
  },
  images: {
    domains: ['api.shelbynet.shelby.xyz'],
  },
};

module.exports = nextConfig;