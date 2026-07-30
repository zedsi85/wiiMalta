/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@wii/ui", "@wii/core", "@wii/db", "@wii/api"],
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
};

export default nextConfig;
