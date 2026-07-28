/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript; Next transpiles them in-place.
  transpilePackages: ["@wii/ui", "@wii/core"],
};

export default nextConfig;
