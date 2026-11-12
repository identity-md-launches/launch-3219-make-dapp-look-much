import { createConfig, fallback, http } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { mainnet, base } from "viem/chains";

export const NETWORKS = {
  1: {
    chain: mainnet,
    name: "Ethereum",
    rpc: ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org"],
    explorer: "https://etherscan.io",
    relay: "https://tacit-evm-pool-keepers.onrender.com/1/evm-pool/keeper",
    confirmations: 3,
  },
  8453: {
    chain: base,
    name: "Base",
    rpc: ["https://base-rpc.publicnode.com", "https://mainnet.base.org"],
    explorer: "https://basescan.org",
    relay: "https://tacit-evm-pool-keepers.onrender.com/8453/evm-pool/keeper",
    confirmations: 10,
  },
} as const;
export type NetworkId = keyof typeof NETWORKS;
export const POOL = "0x000000c2A20657CE25f2Ba99737933D031AFBEE9";
export const ROUTER = "0x0000006C96Afa6f1cD4DF8FE19bc0d8B6A6Cd7B5";

export const config = createConfig({
  chains: [mainnet, base],
  multiInjectedProviderDiscovery: true,
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "Tacit",
      preference: { options: "smartWalletOnly" },
    }),
  ],
  transports: {
    [mainnet.id]: fallback(
      NETWORKS[1].rpc.map((url) => http(url, { timeout: 12_000 })),
    ),
    [base.id]: fallback(
      NETWORKS[8453].rpc.map((url) => http(url, { timeout: 12_000 })),
    ),
  },
});
