/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return { beforeFiles: [], afterFiles: [], fallback: [{ source: "/codes%20icon.svg", destination: "/icon.svg" }] };
  },
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
