import { config } from "./config.js";
import { client } from "./client.js";
import { getPositionsForWallet } from "./services/position.js";
import { getPoolState } from "./services/pool.js";
import { determineRangeStatus, MonitorState } from "./services/monitor.js";
import { calculatePositionAmounts, calculateValuePercents } from "./services/math.js";
import { formatAlertMessage, formatStatusReport, sendAlert } from "./services/notifier.js";
import { clGaugeAbi } from "./contracts/abis.js";
import type { StateChange, PositionSnapshot } from "./types.js";

const monitorState = new MonitorState();
let isRunning = true;

const REPORT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
let lastReportTime = 0;

async function fetchEmissions(
  walletAddress: `0x${string}`,
  gaugeAddress: `0x${string}`,
  tokenId: bigint,
): Promise<number | undefined> {
  try {
    const earned = await client.readContract({
      address: gaugeAddress,
      abi: clGaugeAbi,
      functionName: "earned",
      args: [walletAddress, tokenId],
    });
    return Number(earned) / 1e18; // AERO has 18 decimals
  } catch {
    return undefined;
  }
}

async function poll(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Polling positions for ${config.walletAddress}...`);

  const positions = await getPositionsForWallet(client, config.walletAddress);

  if (positions.length === 0) {
    console.log("  No active CL positions found.");
    return;
  }

  console.log(`  Found ${positions.length} active position(s).`);

  const snapshots: PositionSnapshot[] = [];

  for (const position of positions) {
    const poolState = await getPoolState(client, position.poolAddress);
    const rangeStatus = determineRangeStatus(
      poolState.currentTick,
      position.tickLower,
      position.tickUpper,
      config.thresholdPercent,
    );

    const { amount0, amount1 } = calculatePositionAmounts(position, poolState);
    const { percent0, percent1 } = calculateValuePercents(
      amount0, amount1, poolState.currentTick,
      position.token0Decimals, position.token1Decimals,
    );

    let emissionsEarned: number | undefined;
    if (position.gaugeAddress) {
      emissionsEarned = await fetchEmissions(
        config.walletAddress, position.gaugeAddress, position.tokenId,
      );
    }

    const snapshot: PositionSnapshot = {
      position, poolState, rangeStatus,
      amount0, amount1, percent0, percent1, emissionsEarned,
    };
    snapshots.push(snapshot);

    const pairLabel = `${position.token0Symbol}/${position.token1Symbol}`;
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

      const payload = formatAlertMessage(stateChange, snapshot);
      await sendAlert(config.webhookUrl, config.n8nApiKey, payload);
    }
  }

  // Periodic status report
  const now = Date.now();
  if (now - lastReportTime >= REPORT_INTERVAL_MS) {
    console.log("  📊 Sending periodic status report...");
    const report = formatStatusReport(snapshots);
    await sendAlert(config.webhookUrl, config.n8nApiKey, report);
    lastReportTime = now;
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
