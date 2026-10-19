import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: [
    "localhost", "127.0.0.1",
    ...(process.env.REPLIT_DOMAINS || "").split(","),
    process.env.REPLIT_DEV_DOMAIN,
  ].filter(Boolean),
  transpilePackages: ["@workspace/api-zod", "@workspace/api-client-react"],
  // Keep the managed migration loader on Node's filesystem rather than webpack.
  serverExternalPackages: ["stripe-replit-sync", "stripe", "mongoose", "pg", "bcryptjs", "yahoo-finance2"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/stripe-replit-sync/**/*", "../../node_modules/stripe-replit-sync/**/*"],
  },
  outputFileTracingRoot: path.join(__dirname, "../.."),
};
export default config;
