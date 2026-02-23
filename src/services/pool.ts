import type { AppPublicClient } from "../client.js";
import { clPoolAbi } from "../contracts/abis.js";
import type { PoolState } from "../types.js";

export async function getPoolState(
  client: AppPublicClient,
  poolAddress: `0x${string}`,
): Promise<PoolState> {
  const [sqrtPriceX96, tick] = await client.readContract({
    address: poolAddress,
    abi: clPoolAbi,
    functionName: "slot0",
  });

  return {
    currentTick: tick,
    sqrtPriceX96,
  };
}
