export interface PositionInfo {
  tokenId: bigint;
  token0: `0x${string}`;
  token1: `0x${string}`;
  tickSpacing: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  poolAddress: `0x${string}`;
  npmAddress: `0x${string}`;
  token0Symbol?: string;
  token1Symbol?: string;
}

export interface PoolState {
  currentTick: number;
  sqrtPriceX96: bigint;
}

export type RangeStatus = "in_range" | "near_boundary" | "out_of_range";

export interface PositionState {
  position: PositionInfo;
  poolState: PoolState;
  rangeStatus: RangeStatus;
}

export interface StateChange {
  position: PositionInfo;
  previousStatus: RangeStatus | null;
  currentStatus: RangeStatus;
  poolState: PoolState;
}

export interface WebhookPayload {
  title: string;
  body: string;
}
