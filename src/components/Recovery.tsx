import { useState } from "react";
import { bytesToHex, hexToBytes } from "viem";
import type { Hex } from "viem";
import { Download, KeyRound } from "lucide-react";
import { Modal } from "./Modal";
import { validRecoveryKey } from "../protocol/identity";

export function downloadRecovery(value: string) {
  const url = URL.createObjectURL(
    new Blob([`${value}\n`], { type: "text/plain" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "tacit-recovery-key.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Recovery({
  onClose,
  onImport,
  existing,
}: {
  onClose: () => void;
  onImport: (key: Uint8Array) => void;
  existing: string | null;
}) {
  const [mode, setMode] = useState<"import" | "create">("import");
  const [value, setValue] = useState("");
  const [generated, setGenerated] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={existing ? "Back up your private wallet" : "Use a recovery key"}
      onClose={onClose}
    >
      <div className="modal-symbol">
        <KeyRound size={24} />
      </div>
      <p className="modal-description">
        Anyone with this key can spend your private funds. Keep it offline and
        never share it.
      </p>
      {existing ? (
        <>
          <p className="muted">
            This backup restores your Tacit notes in this app or another
            compatible Tacit wallet.
          </p>
          <button
            className="primary full"
            onClick={() => downloadRecovery(existing)}
          >
            <Download size={17} /> Download recovery key
          </button>
        </>
      ) : (
        <>
          <div className="segmented recovery-tabs">
            <button
              className={mode === "import" ? "selected" : ""}
              onClick={() => {
                setMode("import");
                setError("");
              }}
            >
              Restore a wallet
            </button>
            <button
              className={mode === "create" ? "selected" : ""}
              onClick={() => {
                setMode("create");
                setError("");
              }}
            >
              Create a key
            </button>
          </div>
          {mode === "import" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!validRecoveryKey(value)) {
                  setError(
                    "Enter a valid 64-character hexadecimal recovery key.",
                  );
                  return;
                }
                onImport(
                  hexToBytes(`0x${value.trim().replace(/^0x/, "")}` as Hex),
                );
              }}
            >
              <label htmlFor="recovery-key">Recovery key</label>
              <input
                id="recovery-key"
                className="text-input"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="64 hexadecimal characters"
                aria-invalid={!!error}
                aria-describedby="recovery-error"
              />
              <p id="recovery-error" className="error-message" role="status">
                {error}
              </p>
              <button className="primary full" type="submit">
                Restore private wallet
              </button>
            </form>
          ) : (
            <div className="recovery-create">
              <p className="muted">
                For Coinbase Smart Wallet and other contract wallets, a separate
                recovery key keeps your private balance recoverable. You must
                save this key before continuing.
              </p>
              {!generated ? (
                <button
                  className="secondary full"
                  onClick={() => {
                    let key;
                    do {
                      key = bytesToHex(
                        crypto.getRandomValues(new Uint8Array(32)),
                      );
                    } while (!validRecoveryKey(key));
                    setGenerated(key);
                  }}
                >
                  Generate a recovery key
                </button>
              ) : (
                <>
                  <button
                    className="secondary full"
                    onClick={() => {
                      downloadRecovery(generated);
                      setSaved(true);
                    }}
                  >
                    <Download size={17} /> Save recovery key
                  </button>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={saved}
                      onChange={(event) => setSaved(event.target.checked)}
                    />{" "}
                    I saved my key somewhere safe
                  </label>
                  <button
                    className="primary full"
                    disabled={!saved}
                    onClick={() => onImport(hexToBytes(generated as Hex))}
                  >
                    Open private wallet
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
      <p className="small muted">
        The key stays in memory for this session. Locking or leaving the page
        clears it; your encrypted note cache can remain on this device.
      </p>
    </Modal>
  );
}
