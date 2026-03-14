// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   // App Router is default in Next 14 — no need for experimental.appDir
//   webpack: (config) => {
//     config.resolve.fallback = {
//       ...config.resolve.fallback,
//       fs: false,
//       net: false,
//       tls: false,
//       crypto: false,
//     };
//     // Needed for @solana/* and WalletConnect
//     config.externals.push('pino-pretty', 'lokijs', 'encoding');
//     return config;
//   },
//   images: {
//     domains: ['api.shelbynet.shelby.xyz'],
//   },
// };

// module.exports = nextConfig;


/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  images: {
    domains: ['api.shelbynet.shelby.xyz'],
  },
  // Suppress SSR warnings from wallet libs that use browser APIs
  experimental: {
    esmExternals: 'loose',
  },
};

module.exports = nextConfig;