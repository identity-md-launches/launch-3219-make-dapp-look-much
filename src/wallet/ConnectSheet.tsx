import { useState } from "react";
import { useConnect, useConnectors } from "wagmi";
import { ArrowUpRight, Wallet } from "lucide-react";
import { Modal } from "../components/Modal";
import { OPEN_IN, isMobileBrowser } from "./open-in";

export function ConnectSheet({ onClose }: { onClose: () => void }) {
  const { connectAsync, isPending } = useConnect();
  const connectors = useConnectors();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const mobile = isMobileBrowser();
  const named = connectors.some(
    (c) => c.type === "injected" && c.id !== "injected",
  );
  const listed = [
    ...connectors.filter((c) => c.type === "injected"),
    ...connectors.filter((c) => c.type !== "injected"),
  ].filter(
    (c) =>
      !(c.id === "injected" && named) && (!mobile || c.type !== "injected"),
  );
  return (
    <Modal title="Connect a wallet" onClose={onClose} className="wallet-sheet">
      <p className="muted modal-description">
        Your wallet is yours. Connecting gives Tacit no access to your funds.
      </p>
      <div className="wallet-options">
        {mobile &&
          OPEN_IN.map((wallet) => (
            <a
              className="wallet-row"
              key={wallet.id}
              href={wallet.href(location.href)}
            >
              <img
                src={`./wallets/${wallet.id}.svg`}
                width="28"
                height="28"
                alt=""
              />
              <span>Open in {wallet.name}</span>
              <ArrowUpRight size={16} />
            </a>
          ))}
        {listed.map((connector) => {
          const label =
            connector.id === "injected"
              ? "Browser wallet"
              : connector.id === "coinbaseWalletSDK"
                ? mobile
                  ? "Coinbase Smart Wallet"
                  : "Coinbase Wallet"
                : connector.name;
          return (
            <button
              className="wallet-row"
              key={connector.uid}
              disabled={isPending}
              onClick={async () => {
                setError("");
                setPending(connector.uid);
                try {
                  await connectAsync({ connector });
                  onClose();
                } catch (e) {
                  setError(
                    /reject|denied|cancel/i.test(String(e))
                      ? "Connection cancelled. Choose a wallet to try again."
                      : connector.id === "injected"
                        ? "No browser wallet found. Install a wallet extension, or use Coinbase Wallet."
                        : "Unable to connect. Check your wallet and try again.",
                  );
                } finally {
                  setPending("");
                }
              }}
            >
              {connector.icon ? (
                <img src={connector.icon} width="28" height="28" alt="" />
              ) : connector.id === "coinbaseWalletSDK" ? (
                <img
                  src="./wallets/coinbase.svg"
                  width="28"
                  height="28"
                  alt=""
                />
              ) : (
                <Wallet size={26} />
              )}
              <span>
                {label}
                {pending === connector.uid ? " · Opening…" : ""}
              </span>
              <ArrowUpRight size={16} />
            </button>
          );
        })}
      </div>
      <p className="error-message" role="status">
        {error}
      </p>
      <p className="small muted wallet-footnote">
        New to wallets? Coinbase can create one with a passkey.
      </p>
    </Modal>
  );
}
