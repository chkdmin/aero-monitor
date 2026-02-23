import { getAddress } from "viem";
import type { AppPublicClient } from "../client.js";
import {
  nonfungiblePositionManagerAbi,
  clFactoryAbi,
  clGaugeAbi,
  voterAbi,
  gaugeInfoAbi,
  erc20Abi,
} from "../contracts/abis.js";
import { ADDRESSES, NPM_FACTORY_PAIRS } from "../contracts/addresses.js";
import type { PositionInfo } from "../types.js";

// Cache discovered CL gauges to avoid re-scanning every poll
let cachedCLGauges: `0x${string}`[] | null = null;

async function resolvePosition(
  client: AppPublicClient,
  npm: `0x${string}`,
  factory: `0x${string}`,
  tokenId: bigint,
  gaugeAddress?: `0x${string}`,
): Promise<PositionInfo | null> {
  const pos = await client.readContract({
    address: npm,
    abi: nonfungiblePositionManagerAbi,
    functionName: "positions",
    args: [tokenId],
  });
  const [, , token0, token1, tickSpacing, tickLower, tickUpper, liquidity] = pos;

  if (liquidity === 0n) return null;

  const poolAddress = getAddress(
    await client.readContract({
      address: factory,
      abi: clFactoryAbi,
      functionName: "getPool",
      args: [token0, token1, tickSpacing],
    }),
  );

  const [token0Symbol, token1Symbol, token0Decimals, token1Decimals] = await Promise.all([
    client.readContract({ address: token0, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address: token1, abi: erc20Abi, functionName: "symbol" }),
    client.readContract({ address: token0, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: token1, abi: erc20Abi, functionName: "decimals" }),
  ]);

  return {
    tokenId,
    token0,
    token1,
    tickSpacing,
    tickLower,
    tickUpper,
    liquidity,
    poolAddress,
    npmAddress: npm,
    token0Symbol,
    token1Symbol,
    token0Decimals,
    token1Decimals,
    gaugeAddress,
  };
}

/** Get directly held (unstaked) positions */
async function getUnstakedPositions(
  client: AppPublicClient,
  walletAddress: `0x${string}`,
): Promise<PositionInfo[]> {
  const positions: PositionInfo[] = [];

  for (const { npm, factory } of NPM_FACTORY_PAIRS) {
    const balance = await client.readContract({
      address: npm,
      abi: nonfungiblePositionManagerAbi,
      functionName: "balanceOf",
      args: [walletAddress],
    });

    const count = Number(balance);
    if (count === 0) continue;

    const tokenIds = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        client.readContract({
          address: npm,
          abi: nonfungiblePositionManagerAbi,
          functionName: "tokenOfOwnerByIndex",
          args: [walletAddress, BigInt(i)],
        }),
      ),
    );

    for (const tokenId of tokenIds) {
      const info = await resolvePosition(client, npm, factory, tokenId);
      if (info) positions.push(info);
    }
  }

  return positions;
}

/**
 * Discover all CL gauges via the Voter contract.
 * Flow: Voter.pools[] → Voter.gauges(pool) → filter by CL gaugeFactory.
 * Results are cached so this only runs once per process.
 */
async function discoverCLGauges(
  client: AppPublicClient,
): Promise<`0x${string}`[]> {
  if (cachedCLGauges) return cachedCLGauges;

  const VOTER = getAddress(ADDRESSES.VOTER);
  const CL_GAUGE_FACTORY = getAddress(ADDRESSES.CL_GAUGE_FACTORY);
  const BATCH = 200;

  // 1. Get total pool count from Voter
  const length = Number(
    await client.readContract({ address: VOTER, abi: voterAbi, functionName: "length" }),
  );
  console.log(`[Position] Voter has ${length} pools, discovering CL gauges...`);

  // 2. Fetch all pool addresses
  const allPools: `0x${string}`[] = [];
  for (let offset = 0; offset < length; offset += BATCH) {
    const batchEnd = Math.min(offset + BATCH, length);
    const calls = Array.from({ length: batchEnd - offset }, (_, i) => ({
      address: VOTER,
      abi: voterAbi,
      functionName: "pools" as const,
      args: [BigInt(offset + i)],
    }));
    const results = await client.multicall({ contracts: calls });
    for (const r of results) {
      if (r.status === "success") allPools.push(getAddress(r.result as string));
    }
  }

  // 3. Get gauge address for each pool
  const allGauges: `0x${string}`[] = [];
  for (let offset = 0; offset < allPools.length; offset += BATCH) {
    const batch = allPools.slice(offset, offset + BATCH);
    const calls = batch.map((pool) => ({
      address: VOTER,
      abi: voterAbi,
      functionName: "gauges" as const,
      args: [pool],
    }));
    const results = await client.multicall({ contracts: calls });
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "success") {
        const gauge = getAddress(results[i].result as string);
        if (gauge !== "0x0000000000000000000000000000000000000000") {
          allGauges.push(gauge);
        }
      }
    }
  }

  // 4. Filter to CL gauges only (by gaugeFactory)
  const clGauges: `0x${string}`[] = [];
  for (let offset = 0; offset < allGauges.length; offset += BATCH) {
    const batch = allGauges.slice(offset, offset + BATCH);
    const calls = batch.map((gauge) => ({
      address: gauge,
      abi: gaugeInfoAbi,
      functionName: "gaugeFactory" as const,
    }));
    const results = await client.multicall({ contracts: calls });
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "success") {
        try {
          if (getAddress(results[i].result as string) === CL_GAUGE_FACTORY) {
            clGauges.push(batch[i]);
          }
        } catch { /* skip invalid */ }
      }
    }
  }

  console.log(`[Position] Found ${clGauges.length} CL gauges (from ${allPools.length} pools)`);
  cachedCLGauges = clGauges;
  return clGauges;
}

/** Get staked positions by scanning all CL gauges for the wallet */
async function getStakedPositions(
  client: AppPublicClient,
  walletAddress: `0x${string}`,
): Promise<PositionInfo[]> {
  const clGauges = await discoverCLGauges(client);
  const positions: PositionInfo[] = [];

  // Batch check stakedValues for all CL gauges
  const BATCH_SIZE = 100;
  for (let offset = 0; offset < clGauges.length; offset += BATCH_SIZE) {
    const batch = clGauges.slice(offset, offset + BATCH_SIZE);
    const calls = batch.map((gauge) => ({
      address: gauge,
      abi: clGaugeAbi,
      functionName: "stakedValues" as const,
      args: [walletAddress] as readonly [`0x${string}`],
    }));

    const results = await client.multicall({ contracts: calls });
    for (let i = 0; i < results.length; i++) {
      if (results[i].status !== "success") continue;
      const stakedIds = results[i].result as readonly bigint[];
      if (!stakedIds || stakedIds.length === 0) continue;

      for (const tokenId of stakedIds) {
        for (const { npm, factory } of NPM_FACTORY_PAIRS) {
          try {
            const info = await resolvePosition(client, npm, factory, tokenId, batch[i]);
            if (info) {
              positions.push(info);
              break;
            }
          } catch {
            // Token doesn't belong to this NPM
          }
        }
      }
    }
  }

  return positions;
}

export async function getPositionsForWallet(
  client: AppPublicClient,
  walletAddress: `0x${string}`,
): Promise<PositionInfo[]> {
  // 1. Directly held (unstaked) positions
  const unstaked = await getUnstakedPositions(client, walletAddress);

  // 2. Staked positions from all CL gauges
  const staked = await getStakedPositions(client, walletAddress);

  // Deduplicate by tokenId
  const seen = new Set<string>();
  const all: PositionInfo[] = [];
  for (const p of [...unstaked, ...staked]) {
    const key = p.tokenId.toString();
    if (!seen.has(key)) {
      seen.add(key);
      all.push(p);
    }
  }

  return all;
}
