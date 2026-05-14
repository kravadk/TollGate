/** Central chain registry — single source of truth for mainnet/testnet pairs per workspace. */

export type NetworkMode = "mainnet" | "testnet";

export interface ChainConfig {
  hex: string;        // lowercase 0x… chainId for MetaMask
  chainId: number;
  name: string;
  native: string;     // native gas token symbol
  explorer: string;   // no trailing slash
  rpcUrl: string;
  isNonEvm?: boolean; // true = no MetaMask switching (Sui etc.)
}

export interface WorkspaceChains {
  mainnet: ChainConfig;
  testnet: ChainConfig;
}

export const WORKSPACE_CHAINS: Record<string, WorkspaceChains> = {
  "0g": {
    mainnet: {
      hex: "0x4115", chainId: 16661, name: "0G Mainnet", native: "0G",
      explorer: "https://chainscan.0g.ai", rpcUrl: "https://evmrpc.0g.ai",
    },
    testnet: {
      hex: "0x40da", chainId: 16602, name: "0G Galileo", native: "0G",
      explorer: "https://chainscan-galileo.0g.ai", rpcUrl: "https://evmrpc-testnet.0g.ai",
    },
  },
  mantle: {
    mainnet: {
      hex: "0x1388", chainId: 5000, name: "Mantle", native: "MNT",
      explorer: "https://explorer.mantle.xyz", rpcUrl: "https://rpc.mantle.xyz",
    },
    testnet: {
      hex: "0x138b", chainId: 5003, name: "Mantle Sepolia", native: "MNT",
      explorer: "https://explorer.sepolia.mantle.xyz", rpcUrl: "https://rpc.sepolia.mantle.xyz",
    },
  },
  arbitrum: {
    mainnet: {
      hex: "0xa4b1", chainId: 42161, name: "Arbitrum One", native: "ETH",
      explorer: "https://arbiscan.io", rpcUrl: "https://arb1.arbitrum.io/rpc",
    },
    testnet: {
      hex: "0x66eee", chainId: 421614, name: "Arbitrum Sepolia", native: "ETH",
      explorer: "https://sepolia.arbiscan.io", rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    },
  },
  agora: {
    // Arc L1 — testnet chainId 5042002. Mainnet not yet live; using same chain for both.
    mainnet: {
      hex: "0x4cef52", chainId: 5042002, name: "Arc Mainnet", native: "USDC",
      explorer: "https://arcscan.app", rpcUrl: "https://rpc.arc-node.thecanteenapp.com/v1/public",
    },
    testnet: {
      hex: "0x4cef52", chainId: 5042002, name: "Arc Testnet", native: "USDC",
      explorer: "https://testnet.arcscan.app", rpcUrl: "https://rpc.testnet.arc-node.thecanteenapp.com/v1/public",
    },
  },
  polygon: {
    mainnet: {
      hex: "0x44d", chainId: 1101, name: "Polygon zkEVM", native: "ETH",
      explorer: "https://zkevm.polygonscan.com", rpcUrl: "https://zkevm-rpc.com",
    },
    testnet: {
      hex: "0x985", chainId: 2442, name: "Polygon Cardona", native: "ETH",
      explorer: "https://cardona-zkevm.polygonscan.com", rpcUrl: "https://rpc.cardona.zkevm-rpc.com",
    },
  },
  qie: {
    // QIE currently uses the same network for both modes
    mainnet: {
      hex: "0x7bf", chainId: 1983, name: "QIE Mainnet", native: "QIE",
      explorer: "https://testnet.qie.digital", rpcUrl: "https://rpc1testnet.qie.digital/",
    },
    testnet: {
      hex: "0x7bf", chainId: 1983, name: "QIE Testnet", native: "QIE",
      explorer: "https://testnet.qie.digital", rpcUrl: "https://rpc1testnet.qie.digital/",
    },
  },
  sui: {
    // Sui is non-EVM: hex values are placeholders, no MetaMask switching
    mainnet: {
      hex: "0x101", chainId: 257, name: "Sui Mainnet", native: "SUI",
      explorer: "https://suiscan.xyz", rpcUrl: "https://fullnode.mainnet.sui.io",
      isNonEvm: true,
    },
    testnet: {
      hex: "0x102", chainId: 258, name: "Sui Testnet", native: "SUI",
      explorer: "https://suiscan.xyz/testnet", rpcUrl: "https://fullnode.testnet.sui.io",
      isNonEvm: true,
    },
  },
};

/** Get the active ChainConfig for a workspace + mode. Falls back to Arbitrum Sepolia. */
export function getChain(workspaceId: string, mode: NetworkMode): ChainConfig {
  const ws = WORKSPACE_CHAINS[workspaceId];
  if (!ws) return WORKSPACE_CHAINS["arbitrum"].testnet;
  return ws[mode];
}

/** True when mainnet and testnet use the same chainId (toggle is cosmetic only). */
export function isSingleChain(workspaceId: string): boolean {
  const ws = WORKSPACE_CHAINS[workspaceId];
  if (!ws) return false;
  return ws.mainnet.hex === ws.testnet.hex;
}

/** Find the best explorer base URL for a receipt's network field (display name string). */
export function explorerForNetworkName(networkName: string): string | null {
  if (!networkName) return null;
  const lower = networkName.toLowerCase();
  for (const chains of Object.values(WORKSPACE_CHAINS)) {
    for (const cfg of [chains.mainnet, chains.testnet]) {
      if (cfg.name.toLowerCase() === lower) return cfg.explorer;
    }
  }
  // Partial match fallback
  for (const chains of Object.values(WORKSPACE_CHAINS)) {
    for (const cfg of [chains.mainnet, chains.testnet]) {
      if (lower.includes(cfg.name.toLowerCase()) || cfg.name.toLowerCase().includes(lower)) {
        return cfg.explorer;
      }
    }
  }
  return null;
}

/** Build a tx explorer URL from a network name + tx hash. Returns null if network unknown. */
export function explorerTxForNetwork(networkName: string, txHash: string): string | null {
  const base = explorerForNetworkName(networkName);
  return base ? `${base}/tx/${txHash}` : null;
}

/** Params to pass MetaMask's wallet_addEthereumChain when switching fails (error 4902). */
export function chainAddParams(cfg: ChainConfig): Record<string, unknown> {
  return {
    chainId: cfg.hex,
    chainName: cfg.name,
    nativeCurrency: { name: cfg.native, symbol: cfg.native, decimals: 18 },
    rpcUrls: [cfg.rpcUrl],
    blockExplorerUrls: [cfg.explorer],
  };
}
