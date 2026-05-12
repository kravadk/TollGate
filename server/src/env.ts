import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 8787),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173",
  x402PayoutAddress: process.env.X402_PAYOUT_ADDRESS ?? "0x0000000000000000000000000000000000000000",
  x402Network: process.env.X402_NETWORK ?? "base-sepolia",
  x402Asset: process.env.X402_ASSET ?? "USDC",
} as const;

export const isProd = () => env.nodeEnv === "production";
