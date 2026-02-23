import type { PositionInfo, PoolState } from "../types.js";

export function calculatePositionAmounts(
  position: PositionInfo,
  poolState: PoolState,
): { amount0: number; amount1: number } {
  const L = Number(position.liquidity);
  const sqrtCurrent = Math.pow(1.0001, poolState.currentTick / 2);
  const sqrtLower = Math.pow(1.0001, position.tickLower / 2);
  const sqrtUpper = Math.pow(1.0001, position.tickUpper / 2);

  let amount0Raw: number;
  let amount1Raw: number;

  if (poolState.currentTick < position.tickLower) {
    amount0Raw = L * (1 / sqrtLower - 1 / sqrtUpper);
    amount1Raw = 0;
  } else if (poolState.currentTick >= position.tickUpper) {
    amount0Raw = 0;
    amount1Raw = L * (sqrtUpper - sqrtLower);
  } else {
    amount0Raw = L * (1 / sqrtCurrent - 1 / sqrtUpper);
    amount1Raw = L * (sqrtCurrent - sqrtLower);
  }

  return {
    amount0: amount0Raw / 10 ** position.token0Decimals,
    amount1: amount1Raw / 10 ** position.token1Decimals,
  };
}

export function calculateValuePercents(
  amount0: number,
  amount1: number,
  currentTick: number,
  token0Decimals: number,
  token1Decimals: number,
): { percent0: number; percent1: number } {
  // price = token1/token0 in human-readable terms
  const rawPrice = Math.pow(1.0001, currentTick);
  const price = rawPrice * 10 ** token0Decimals / 10 ** token1Decimals;

  const value0InToken1 = amount0 * price;
  const totalValue = value0InToken1 + amount1;

  if (totalValue === 0) return { percent0: 0, percent1: 0 };

  return {
    percent0: (value0InToken1 / totalValue) * 100,
    percent1: (amount1 / totalValue) * 100,
  };
}
