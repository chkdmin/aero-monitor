import type { RangeStatus } from "../types.js";

/**
 * Determine whether the current tick is in range, near a boundary, or out of range.
 *
 * - out_of_range: currentTick < tickLower OR currentTick >= tickUpper
 * - near_boundary: within threshold ticks of either boundary (but still in range)
 * - in_range: everything else
 */
export function determineRangeStatus(
  currentTick: number,
  tickLower: number,
  tickUpper: number,
  thresholdPercent: number,
): RangeStatus {
  // Out of range check first
  if (currentTick < tickLower || currentTick >= tickUpper) {
    return "out_of_range";
  }

  const rangeWidth = tickUpper - tickLower;
  const thresholdTicks = Math.floor((rangeWidth * thresholdPercent) / 100);

  // Near lower boundary: tickLower <= currentTick < tickLower + thresholdTicks
  if (currentTick < tickLower + thresholdTicks) {
    return "near_boundary";
  }

  // Near upper boundary: tickUpper - thresholdTicks <= currentTick < tickUpper
  if (currentTick >= tickUpper - thresholdTicks) {
    return "near_boundary";
  }

  return "in_range";
}

/**
 * Tracks per-position range status and detects state changes.
 *
 * checkStateChange returns a lightweight result so the caller can construct
 * the full StateChange (which requires position and poolState context).
 */
export class MonitorState {
  private previousStates: Map<string, RangeStatus> = new Map();

  /**
   * Check whether a position's range status has changed.
   *
   * Returns an object with previousStatus and currentStatus when:
   *   - The position is seen for the first time AND the status is NOT 'in_range'
   *   - The status differs from the previously recorded status
   *
   * Returns null when:
   *   - The position is seen for the first time and is 'in_range' (no alert needed)
   *   - The status is the same as the previously recorded status
   */
  checkStateChange(
    tokenId: bigint,
    newStatus: RangeStatus,
  ): { previousStatus: RangeStatus | null; currentStatus: RangeStatus } | null {
    const key = tokenId.toString();
    const previousStatus = this.previousStates.get(key) ?? null;

    // Always update internal state
    this.previousStates.set(key, newStatus);

    // First time seeing this position
    if (previousStatus === null) {
      // Only alert if it's not in_range
      if (newStatus !== "in_range") {
        return { previousStatus: null, currentStatus: newStatus };
      }
      return null;
    }

    // Status unchanged
    if (previousStatus === newStatus) {
      return null;
    }

    // Status changed
    return { previousStatus, currentStatus: newStatus };
  }
}
