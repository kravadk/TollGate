/**
 * Real 0G Storage upload using @0glabs/0g-ts-sdk.
 *
 * The SDK computes a genuine 0G Merkle root from the content before touching
 * the chain. We capture that root (it IS the real 0G content-address) even if
 * the flow-contract tx reverts. The response distinguishes three states:
 *
 *   onChain: true   — root committed on-chain via FixedPriceFlow.submit(), data in nodes
 *   onChain: false  — real Merkle root computed, tx failed (returned as simulated)
 *   simulated: true — SDK unavailable / no private key, root = sha256 fallback
 */

const OG_INDEXER     = process.env.OG_STORAGE_INDEXER ?? "https://indexer-storage-turbo.0g.ai";
const OG_EVM_RPC     = process.env.OG_RPC_URL          ?? "https://evmrpc.0g.ai";
const OG_FLOW_ADDR   = process.env.OG_FLOW_ADDRESS     ?? "0x62d4144db0f0a6fbbaeb6296c785c71b3d57c526";
const OG_PRIVATE_KEY = process.env.OG_PRIVATE_KEY      ?? "";
const OG_EXPLORER    = process.env.OG_EXPLORER_URL     ?? "https://chainscan.0g.ai";

export type UploadResult = {
  root: string;
  txHash: string;
  explorerUrl: string;
  simulated: boolean;
  onChain: boolean;
  merkleComputed: boolean;
  nodeUrl?: string;
  error?: string;
};

async function sha256Fallback(content: string): Promise<string> {
  const { createHash } = await import("crypto");
  return "0x" + createHash("sha256").update(content).digest("hex");
}

export async function uploadToOg(content: string): Promise<UploadResult> {
  if (!OG_PRIVATE_KEY) {
    return { root: await sha256Fallback(content), txHash: "", explorerUrl: "", simulated: true, onChain: false, merkleComputed: false };
  }

  type OgSdk = {
    Indexer: new (url: string) => { getShardedNodes(): Promise<{ trusted: { url: string }[] }> };
    Uploader: new (nodes: string[], rpc: string, flow: unknown) => {
      uploadFile(data: unknown, opts: unknown): Promise<[{ txHash: string; rootHash: string }, Error | null]>;
    };
    MemData: new (bytes: Uint8Array) => unknown & {
      merkleTree(): Promise<[{ rootHash(): string | null } | null, Error | null]>;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFlowContract: (addr: string, signer: any) => unknown;
  };

  let realRoot: string | null = null;
  let nodeUrl: string | undefined;

  try {
    const [sdkMod, ethersMod] = await Promise.all([
      import("@0glabs/0g-ts-sdk"),
      import("ethers"),
    ]);
    const sdk = sdkMod as unknown as OgSdk;
    const { Indexer, Uploader, MemData } = sdk;
    const { ethers } = ethersMod;

    // 1. Get storage nodes
    const indexer = new Indexer(OG_INDEXER);
    const { trusted: nodes } = await indexer.getShardedNodes();
    const nodeUrls = nodes.map((n) => n.url);
    if (nodeUrls.length === 0) throw new Error("No storage nodes");
    nodeUrl = nodeUrls[0];

    // 2. Build blob and compute the real 0G Merkle root
    const bytes = new TextEncoder().encode(content);
    const memData = new MemData(bytes);

    // Capture the Merkle root BEFORE attempting the on-chain tx
    const [tree, treeErr] = await memData.merkleTree();
    if (!treeErr && tree) {
      const r = tree.rootHash();
      if (r) realRoot = r;
    }

    // 3. Attempt on-chain commit via FixedPriceFlow.submit()
    const provider = new ethers.JsonRpcProvider(OG_EVM_RPC);
    const signer = new ethers.Wallet(OG_PRIVATE_KEY, provider);
    const flowContract = sdk.getFlowContract(OG_FLOW_ADDR, signer);
    const uploader = new Uploader(nodeUrls, OG_EVM_RPC, flowContract);
    const [result, err] = await uploader.uploadFile(memData, { tags: "0x" });

    if (!err) {
      // Full success: root committed on-chain, data in storage nodes
      const txHash   = result.txHash   ?? "";
      const rootHash = result.rootHash ?? realRoot ?? await sha256Fallback(content);
      return {
        root: rootHash, txHash, explorerUrl: txHash ? `${OG_EXPLORER}/tx/${txHash}` : "",
        simulated: false, onChain: true, merkleComputed: true, nodeUrl,
      };
    }

    // On-chain tx failed but we have the real Merkle root
    console.warn("[og-upload] flow contract tx failed:", err.message.slice(0, 120));
  } catch (err) {
    console.error("[og-upload] SDK error:", (err as Error).message.slice(0, 120));
  }

  // Return real Merkle root if computed, else sha256 fallback
  const root = realRoot ?? await sha256Fallback(content);
  return {
    root,
    txHash: "",
    explorerUrl: "",
    simulated: !realRoot,       // false = real 0G Merkle root; true = sha256 only
    onChain: false,
    merkleComputed: !!realRoot,
    nodeUrl,
    error: realRoot ? "Flow contract tx reverted — root computed, not yet committed on-chain" : undefined,
  };
}
