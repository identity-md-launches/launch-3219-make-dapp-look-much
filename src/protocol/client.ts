import type { PrivateWallet, Provider, WalletModule } from "./types";
import { NETWORKS } from "../wallet/config";
import type { NetworkId } from "../wallet/config";

let modulePromise: Promise<WalletModule> | undefined;
function walletModule(): Promise<WalletModule> {
  return (modulePromise ??= import(
    /* @vite-ignore */ new URL(
      "protocol/tacit-evm-pool-wallet.js",
      document.baseURI,
    ).href
  ));
}

async function readArtifact(name: string) {
  const urls = [
    `https://tacit.finance/evm-pool/${name}`,
    `https://raw.githubusercontent.com/z0r0z/tacit/c61a8e5f9d27a738bacc34765286a745d86d0f19/dapp/evm-pool/${name}`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(60_000),
      });
      if (response.ok) return new Uint8Array(await response.arrayBuffer());
    } catch {
      /* Try the independent mirror; the wallet verifies pins before use. */
    }
  }
  throw new Error(
    "Unable to download the proving files. Check your connection and try again.",
  );
}

// The upstream module checks both SHA-256 hashes and the verification-key hash.
export async function openPrivateWallet(
  provider: Provider,
  chainId: NetworkId,
  identityKey: Uint8Array,
): Promise<PrivateWallet> {
  const module = await walletModule();
  const network = NETWORKS[chainId];
  return module.makeEvmPoolWallet({
    provider,
    chainId,
    identityKey,
    rpc: [...network.rpc],
    relay: network.relay,
    confirmations: network.confirmations,
    artifacts: async () => {
      const [wasm, zkey, vkResponse] = await Promise.all([
        readArtifact("transact.wasm"),
        readArtifact("transact_final.zkey"),
        fetch(new URL("protocol/transact_vk.json", document.baseURI)),
      ]);
      if (!vkResponse.ok)
        throw new Error(
          "Unable to load the verification key. Reload and try again.",
        );
      return { wasm, zkey, vk: await vkResponse.json() };
    },
    store: {
      get: (key) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      set: (key, value) => {
        localStorage.setItem(key, value);
      },
    },
  });
}
