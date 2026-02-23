import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { config } from "./config.js";

export const client = createPublicClient({
  chain: base,
  transport: http(config.rpcUrl),
});

export type AppPublicClient = typeof client;
