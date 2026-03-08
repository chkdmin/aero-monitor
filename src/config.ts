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
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  telegramChatId: requireEnv("TELEGRAM_CHAT_ID"),
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? "60000", 10),
  thresholdPercent: parseFloat(process.env.THRESHOLD_PERCENT ?? "5"),
} as const;
