import type { AppPublicClient } from "../client.js";
import { nonfungiblePositionManagerAbi, clFactoryAbi, erc20Abi } from "../contracts/abis.js";
import { NPM_FACTORY_PAIRS } from "../contracts/addresses.js";
import type { PositionInfo } from "../types.js";

export async function getPositionsForWallet(
  client: AppPublicClient,
  walletAddress: `0x${string}`,
): Promise<PositionInfo[]> {
  const allPositions: PositionInfo[] = [];

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

    const positionResults = await Promise.all(
      tokenIds.map((tokenId) =>
        client.readContract({
          address: npm,
          abi: nonfungiblePositionManagerAbi,
          functionName: "positions",
          args: [tokenId],
        }),
      ),
    );

    for (let i = 0; i < tokenIds.length; i++) {
      const pos = positionResults[i];
      const [, , token0, token1, tickSpacing, tickLower, tickUpper, liquidity] = pos;

      // Skip closed positions
      if (liquidity === 0n) continue;

      const poolAddress = await client.readContract({
        address: factory,
        abi: clFactoryAbi,
        functionName: "getPool",
        args: [token0, token1, tickSpacing],
      });

      // Fetch token symbols
      const [token0Symbol, token1Symbol] = await Promise.all([
        client.readContract({ address: token0, abi: erc20Abi, functionName: "symbol" }),
        client.readContract({ address: token1, abi: erc20Abi, functionName: "symbol" }),
      ]);

      allPositions.push({
        tokenId: tokenIds[i],
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
      });
    }
  }

  return allPositions;
}
