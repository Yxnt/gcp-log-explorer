/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  assetPrefix: '',
  basePath: '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
