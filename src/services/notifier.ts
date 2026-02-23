import type { AlertPayload, StateChange } from "../types.js";

export function formatAlertMessage(change: StateChange): AlertPayload {
  return {
    tokenId: change.position.tokenId.toString(),
    pool: `${change.position.token0Symbol ?? "Unknown"}/${change.position.token1Symbol ?? "Unknown"}`,
    previousStatus: change.previousStatus,
    currentStatus: change.currentStatus,
    currentTick: change.poolState.currentTick,
    tickLower: change.position.tickLower,
    tickUpper: change.position.tickUpper,
    token0Symbol: change.position.token0Symbol ?? "Unknown",
    token1Symbol: change.position.token1Symbol ?? "Unknown",
  };
}

export async function sendAlert(
  webhookUrl: string,
  payload: AlertPayload,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(
        `Alert sent successfully for token ${payload.tokenId} (${payload.pool}): ${payload.currentStatus}`,
      );
      return;
    } catch (error) {
      if (attempt === 0) {
        console.error(
          `Alert delivery failed (attempt 1), retrying in 3s...`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        console.error(
          `Alert delivery failed (attempt 2), giving up.`,
          error,
        );
      }
    }
  }
}
