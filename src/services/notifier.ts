import type { WebhookPayload, StateChange } from "../types.js";

const STATUS_LABELS: Record<string, string> = {
  in_range: "In Range ✅",
  near_boundary: "경계 근접 ⚠️",
  out_of_range: "Range 이탈 🚨",
};

function formatStatus(status: string | null): string {
  if (!status) return "초기 감지";
  return STATUS_LABELS[status] ?? status;
}

export function formatAlertMessage(change: StateChange): WebhookPayload {
  const { position, poolState } = change;
  const pair = `${position.token0Symbol ?? "Unknown"}/${position.token1Symbol ?? "Unknown"}`;

  const emoji = change.currentStatus === "out_of_range" ? "🚨" : change.currentStatus === "near_boundary" ? "⚠️" : "✅";
  const title = `${emoji} LP Range 알림: ${pair}`;

  const lines: string[] = [];
  lines.push(`${formatStatus(change.previousStatus)} → ${formatStatus(change.currentStatus)}`);
  lines.push(`Pool: ${pair}`);
  lines.push(`Position #${position.tokenId}`);
  lines.push(`현재 tick: ${poolState.currentTick}`);
  lines.push(`Range: [${position.tickLower}, ${position.tickUpper})`);

  return {
    title,
    body: lines.join("\n"),
  };
}

export function formatStatusReport(
  positionStates: { position: StateChange["position"]; poolState: StateChange["poolState"]; rangeStatus: string }[],
): WebhookPayload {
  const title = "📊 LP 현황 리포트";
  const lines: string[] = [];

  if (positionStates.length === 0) {
    lines.push("활성 포지션 없음");
  } else {
    for (const { position, poolState, rangeStatus } of positionStates) {
      const pair = `${position.token0Symbol ?? "Unknown"}/${position.token1Symbol ?? "Unknown"}`;
      const statusLabel = STATUS_LABELS[rangeStatus] ?? rangeStatus;
      lines.push(`[#${position.tokenId}] ${pair}`);
      lines.push(`  ${statusLabel} | tick: ${poolState.currentTick}`);
      lines.push(`  Range: [${position.tickLower}, ${position.tickUpper})`);
      lines.push("");
    }
  }

  return { title, body: lines.join("\n").trimEnd() };
}

export async function sendAlert(
  webhookUrl: string,
  apiKey: string,
  payload: WebhookPayload,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log(`[Notifier] Alert sent: ${payload.title}`);
      return;
    } catch (error) {
      if (attempt === 0) {
        console.error("[Notifier] Alert delivery failed (attempt 1), retrying in 3s...", error);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        console.error("[Notifier] Alert delivery failed (attempt 2), giving up.", error);
      }
    }
  }
}
