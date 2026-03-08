import type { WebhookPayload, StateChange, PositionSnapshot } from "../types.js";

const STATUS_LABELS: Record<string, string> = {
  in_range: "In Range ✅",
  near_boundary: "경계 근접 ⚠️",
  out_of_range: "Range 이탈 🚨",
};

function formatStatus(status: string | null): string {
  if (!status) return "초기 감지";
  return STATUS_LABELS[status] ?? status;
}

function formatAmount(amount: number): string {
  if (amount >= 1000) return amount.toFixed(2);
  if (amount >= 1) return amount.toFixed(4);
  if (amount >= 0.0001) return amount.toFixed(6);
  return amount.toExponential(4);
}

function formatSnapshotBlock(snap: PositionSnapshot): string {
  const { position, amount0, amount1, percent0, percent1, emissionsEarned } = snap;
  const lines: string[] = [];

  lines.push(`${position.token0Symbol}: ${formatAmount(amount0)} (${percent0.toFixed(1)}%)`);
  lines.push(`${position.token1Symbol}: ${formatAmount(amount1)} (${percent1.toFixed(1)}%)`);

  if (emissionsEarned !== undefined) {
    lines.push(`AERO 보상: ${formatAmount(emissionsEarned)}`);
  }

  lines.push(`현재 tick: ${snap.poolState.currentTick}`);
  lines.push(`Range: [${position.tickLower}, ${position.tickUpper})`);

  return lines.join("\n");
}

export function formatAlertMessage(change: StateChange, snapshot: PositionSnapshot): WebhookPayload {
  const { position } = change;
  const pair = `${position.token0Symbol}/${position.token1Symbol}`;

  const emoji = change.currentStatus === "out_of_range" ? "🚨" : change.currentStatus === "near_boundary" ? "⚠️" : "✅";
  const title = `${emoji} LP Range 알림: ${pair}`;

  const lines: string[] = [];
  lines.push(`${formatStatus(change.previousStatus)} → ${formatStatus(change.currentStatus)}`);
  lines.push(`Position #${position.tokenId}`);
  lines.push("");
  lines.push(formatSnapshotBlock(snapshot));

  return { title, body: lines.join("\n") };
}

export function formatStatusReport(snapshots: PositionSnapshot[]): WebhookPayload {
  const title = "📊 LP 현황 리포트";

  if (snapshots.length === 0) {
    return { title, body: "활성 포지션 없음" };
  }

  const blocks: string[] = [];
  for (const snap of snapshots) {
    const { position, rangeStatus } = snap;
    const pair = `${position.token0Symbol}/${position.token1Symbol}`;
    const statusLabel = STATUS_LABELS[rangeStatus] ?? rangeStatus;

    const lines: string[] = [];
    lines.push(`[#${position.tokenId}] ${pair} ${statusLabel}`);
    lines.push(formatSnapshotBlock(snap));
    blocks.push(lines.join("\n"));
  }

  return { title, body: blocks.join("\n\n") };
}

export async function sendAlert(
  botToken: string,
  chatId: string,
  payload: WebhookPayload,
): Promise<void> {
  const text = `${payload.title}\n\n${payload.body}`;
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
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
