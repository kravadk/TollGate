export const RPCS = {
  mantle: "https://rpc.mantle.xyz",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  og: "https://evmrpc.0g.ai",
  polygon: "https://polygon-rpc.com",
} as const;

export type RpcChain = keyof typeof RPCS;

export interface EvmLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

let _id = 1;
async function rpc<T>(chain: RpcChain, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPCS[chain], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: _id++, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = await res.json() as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

export async function getBlockNumber(chain: RpcChain): Promise<number> {
  const hex = await rpc<string>(chain, "eth_blockNumber", []);
  return parseInt(hex, 16);
}

export async function getGasPrice(chain: RpcChain): Promise<number> {
  const hex = await rpc<string>(chain, "eth_gasPrice", []);
  return Math.round(parseInt(hex, 16) / 1e9); // gwei
}

export async function getTokenTransferLogs(
  chain: RpcChain,
  tokenAddress: string,
  fromBlock: number | "latest" = "latest",
  toBlock: number | "latest" = "latest",
): Promise<EvmLog[]> {
  const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const from = fromBlock === "latest" ? "latest" : "0x" + fromBlock.toString(16);
  const to = toBlock === "latest" ? "latest" : "0x" + toBlock.toString(16);
  return rpc<EvmLog[]>(chain, "eth_getLogs", [{
    address: tokenAddress,
    topics: [TRANSFER_TOPIC],
    fromBlock: from,
    toBlock: to,
  }]);
}

export async function ethCall(
  chain: RpcChain,
  to: string,
  data: string,
): Promise<string> {
  return rpc<string>(chain, "eth_call", [{ to, data }, "latest"]);
}

/** Read ERC-20 balanceOf(address) */
export async function erc20BalanceOf(
  chain: RpcChain,
  token: string,
  holder: string,
): Promise<bigint> {
  // balanceOf(address) = 0x70a08231
  const padded = holder.replace("0x", "").padStart(64, "0");
  const result = await ethCall(chain, token, "0x70a08231" + padded);
  return BigInt(result);
}
