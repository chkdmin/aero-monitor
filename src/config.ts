import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  walletAddress: requireEnv("WALLET_ADDRESS") as `0x${string}`,
  rpcUrl: requireEnv("RPC_URL"),
  webhookUrl: requireEnv("WEBHOOK_URL"),
  n8nApiKey: requireEnv("N8N_API_KEY"),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? "60000", 10),
  thresholdPercent: parseFloat(process.env.THRESHOLD_PERCENT ?? "5"),
} as const;
