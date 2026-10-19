/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: [
    "localhost", "127.0.0.1",
    ...(process.env.REPLIT_DOMAINS || "").split(","),
    process.env.REPLIT_DEV_DOMAIN,
  ].filter(Boolean),
  transpilePackages: ["@workspace/api-client-react", "@workspace/api-zod"],
  // Keep the managed migration loader on Node's filesystem rather than webpack.
  serverExternalPackages: ["stripe-replit-sync", "stripe", "mongoose", "pg"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/stripe-replit-sync/**/*", "../../node_modules/stripe-replit-sync/**/*"],
  },
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};
export default config;
