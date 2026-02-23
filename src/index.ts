import { config } from "./config.js";
import { client } from "./client.js";
import { getPositionsForWallet } from "./services/position.js";
import { getPoolState } from "./services/pool.js";
import { determineRangeStatus, MonitorState } from "./services/monitor.js";
import { formatAlertMessage, sendAlert } from "./services/notifier.js";
import type { StateChange } from "./types.js";

const monitorState = new MonitorState();
let isRunning = true;

async function poll(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Polling positions for ${config.walletAddress}...`);

  const positions = await getPositionsForWallet(client, config.walletAddress);

  if (positions.length === 0) {
    console.log("  No active CL positions found.");
    return;
  }

  console.log(`  Found ${positions.length} active position(s).`);

  for (const position of positions) {
    const poolState = await getPoolState(client, position.poolAddress);
    const rangeStatus = determineRangeStatus(
      poolState.currentTick,
      position.tickLower,
      position.tickUpper,
      config.thresholdPercent,
    );

    const pairLabel = `${position.token0Symbol ?? "?"}/${position.token1Symbol ?? "?"}`;
    console.log(
      `  [#${position.tokenId}] ${pairLabel} | tick=${poolState.currentTick} range=[${position.tickLower}, ${position.tickUpper}) | ${rangeStatus}`,
    );

    const change = monitorState.checkStateChange(position.tokenId, rangeStatus);
    if (change) {
      const stateChange: StateChange = {
        position,
        previousStatus: change.previousStatus,
        currentStatus: change.currentStatus,
        poolState,
      };

      console.log(
        `  ⚡ State change: ${change.previousStatus ?? "initial"} → ${change.currentStatus}`,
      );

      const payload = formatAlertMessage(stateChange);
      await sendAlert(config.webhookUrl, payload);
    }
  }
}

async function main(): Promise<void> {
  console.log("=== Aero Monitor ===");
  console.log(`Wallet: ${config.walletAddress}`);
  console.log(`RPC: ${config.rpcUrl}`);
  console.log(`Poll interval: ${config.pollIntervalMs}ms`);
  console.log(`Threshold: ${config.thresholdPercent}%`);
  console.log("");

  while (isRunning) {
    try {
      await poll();
    } catch (error) {
      console.error("Poll error:", error);
    }

    if (!isRunning) break;
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
  }

  console.log("Shutting down...");
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT");
  isRunning = false;
});
process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM");
  isRunning = false;
});

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
