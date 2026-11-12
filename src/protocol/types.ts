import type { Hex } from "viem";

export type Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
export type Summary = {
  balance: bigint;
  notes: number;
  leaves: number;
  block: number;
  stored?: boolean;
};
export type Quote = { fee: string | number; relayer: string };
export type ActionOptions = {
  via?: "self" | "relay";
  maxFee?: bigint;
  onStep?: (step: string) => void;
};
export type PrivateWallet = {
  address: string;
  sync: () => Promise<Summary>;
  rescan: () => Promise<Summary>;
  balance: () => bigint;
  receive: {
    address: string;
    waiting: () => Promise<bigint>;
    sweep: (options?: ActionOptions) => Promise<Hex>;
  };
  deposit: (amount: bigint, options?: ActionOptions) => Promise<Hex>;
  send: (to: string, amount: bigint, options?: ActionOptions) => Promise<Hex>;
  withdraw: (
    to: string,
    amount: bigint,
    options?: ActionOptions,
  ) => Promise<Hex>;
  quote: () => Promise<Quote>;
  terminate: () => void;
};
export type WalletModule = {
  makeEvmPoolWallet: (options: {
    provider: Provider;
    chainId: number;
    identityKey: Uint8Array;
    artifacts: () => Promise<{
      wasm: Uint8Array;
      zkey: Uint8Array;
      vk: unknown;
    }>;
    relay: string;
    rpc: string[];
    confirmations: number;
    store: {
      get: (key: string) => string | null;
      set: (key: string, value: string) => void;
    };
  }) => Promise<PrivateWallet>;
};
