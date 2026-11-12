import { useEffect, useRef, useState } from "react";
import { useConnection } from "wagmi";
import type { Hex } from "viem";
import { bytesToHex } from "viem";
import { deriveIdentity } from "./identity";
import { openPrivateWallet } from "./client";
import type { NetworkId } from "../wallet/config";
import type { PrivateWallet, Provider, Summary } from "./types";

export function readableError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  if (
    (error as { said?: boolean })?.said ||
    /may still have sent|already on its way|Check Activity/i.test(text)
  )
    return text
      .split("\n")[0]
      .replace(/Check Activity(?: before sending again)?\.?/gi, "Refresh your private balance before trying again.")
      .slice(0, 300);
  if (/reject|denied|cancel|4001/i.test(text))
    return "Request cancelled. You can try again.";
  if (/insufficient|not enough|balance/i.test(text))
    return "Not enough ETH for this amount and its fee. Enter a smaller amount.";
  if (/fetch|network|timeout|timed out|RPC|502|503/i.test(text))
    return "Unable to reach the network. Check your connection and try again.";
  return text.split("\n")[0].slice(0, 260);
}

export function usePrivateWallet(network: NetworkId) {
  const { address, connector } = useConnection();
  const [wallet, setWallet] = useState<PrivateWallet | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const key = useRef<Uint8Array | null>(null);
  const current = useRef<PrivateWallet | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    generation.current++;
    current.current?.terminate();
    current.current = null;
    key.current?.fill(0);
    key.current = null;
    setWallet(null);
    setSummary(null);
    setError("");
    setBusy(false);
    setStep("");
    return () => {
      generation.current++;
      current.current?.terminate();
      key.current?.fill(0);
    };
  }, [address, network, connector?.uid]);

  async function unlock(recoveryKey?: Uint8Array) {
    if (!connector || !address) return false;
    const version = generation.current;
    setBusy(true);
    setError("");
    try {
      const provider = (await connector.getProvider()) as Provider;
      const guarded: Provider = {
        request: async (args) => {
          if (version !== generation.current)
            throw new Error("The wallet changed. Reconnect and try again.");
          if (
            [
              "eth_sendTransaction",
              "personal_sign",
              "eth_signTypedData_v4",
            ].includes(args.method)
          ) {
            const accounts = (await provider.request({
              method: "eth_accounts",
            })) as string[];
            const chain = (await provider.request({
              method: "eth_chainId",
            })) as string;
            if (
              accounts[0]?.toLowerCase() !== address.toLowerCase() ||
              Number(BigInt(chain)) !== network
            )
              throw new Error(
                "The account or network changed. Reconnect and try again.",
              );
          }
          return provider.request(args);
        },
      };
      const identity =
        recoveryKey ?? (await deriveIdentity(guarded, address as Hex, setStep));
      if (version !== generation.current) {
        identity.fill(0);
        return false;
      }
      setStep("Opening your private wallet");
      const opened = await openPrivateWallet(guarded, network, identity);
      if (version !== generation.current) {
        identity.fill(0);
        opened.terminate();
        return false;
      }
      key.current = identity;
      current.current = opened;
      setWallet(opened);
      setStep("Finding your private notes");
      try {
        const result = await opened.sync();
        if (version === generation.current) setSummary(result);
      } catch (e) {
        if (version === generation.current)
          setError(`${readableError(e)} Refresh your balance to retry.`);
      }
      return version === generation.current;
    } catch (e) {
      if (version === generation.current) setError(readableError(e));
      return false;
    } finally {
      if (version === generation.current) {
        setBusy(false);
        setStep("");
      }
    }
  }

  async function refresh(rescan = false) {
    const active = current.current;
    if (!active) return;
    const version = generation.current;
    setBusy(true);
    setError("");
    setStep(rescan ? "Rescanning chain history" : "Refreshing private balance");
    try {
      const result = await (rescan ? active.rescan() : active.sync());
      if (version === generation.current) setSummary(result);
    } catch (e) {
      if (version === generation.current) setError(readableError(e));
    } finally {
      if (version === generation.current) {
        setBusy(false);
        setStep("");
      }
    }
  }

  function lock() {
    generation.current++;
    current.current?.terminate();
    current.current = null;
    key.current?.fill(0);
    key.current = null;
    setWallet(null);
    setSummary(null);
    setError("");
    setBusy(false);
    setStep("");
  }

  function recovery() {
    return key.current ? bytesToHex(key.current) : null;
  }
  return {
    wallet,
    summary,
    busy,
    step,
    error,
    setError,
    unlock,
    refresh,
    lock,
    recovery,
  };
}
