/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript; Next transpiles them in-place.
  transpilePackages: ["@wii/ui", "@wii/core", "@wii/db"],
  experimental: {
    // Native/pg drivers must stay external to the server bundle.
    serverComponentsExternalPackages: ["pg"],
  },
};

export default nextConfig;
