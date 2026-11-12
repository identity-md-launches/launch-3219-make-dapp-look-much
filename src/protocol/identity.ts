import {
  bytesToHex,
  hexToBytes,
  keccak256,
  recoverMessageAddress,
  sha256,
  toHex,
} from "viem";
import type { Hex } from "viem";
import type { Provider } from "./types";

// Exact upstream message: changing any byte creates a different private wallet.
export const IDENTITY_MESSAGE = [
  "Tacit identity",
  "",
  "Signing this creates your Tacit private key. Anyone who has this signature controls all of your Tacit funds.",
  "",
  "Sign it only in a Tacit app you trust. Every Tacit app asks for exactly this message.",
  "",
  "network: mainnet",
  "version: 1",
].join("\n");
const ORDER =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

function canonical(signature: unknown) {
  if (typeof signature !== "string" || !/^0x[\da-f]{130}$/i.test(signature))
    throw new Error(
      "This wallet needs a recovery key. Use “Recovery key” below.",
    );
  const bytes = hexToBytes(signature as Hex);
  if (bytes[64] < 2) bytes[64] += 27;
  if (
    BigInt(bytesToHex(bytes.slice(32, 64))) > ORDER / 2n ||
    ![27, 28].includes(bytes[64])
  )
    throw new Error(
      "This wallet returned an unsupported signature. Use a recovery key instead.",
    );
  return bytesToHex(bytes);
}

function scalar(bytes: Uint8Array): Uint8Array {
  const n = BigInt(bytesToHex(bytes));
  return n > 0n && n < ORDER
    ? bytes
    : scalar(
        hexToBytes(
          sha256(
            bytesToHex(
              new Uint8Array([
                ...bytes,
                ...new TextEncoder().encode("tacit-prf-recovery"),
              ]),
            ),
          ),
        ),
      );
}

export async function deriveIdentity(
  provider: Provider,
  address: Hex,
  step: (message: string) => void,
) {
  const code = await provider.request({
    method: "eth_getCode",
    params: [address, "latest"],
  });
  if (typeof code !== "string")
    throw new Error("Unable to check this wallet. Reconnect and try again.");
  // EIP-7702 delegated EOAs still sign deterministically; other code means a contract wallet.
  if (code !== "0x" && !/^0xef0100[\da-f]{40}$/i.test(code))
    throw new Error(
      "Smart wallets need a recovery key. Choose “Recovery key” to create or restore one.",
    );
  step("Confirm the identity message in your wallet");
  const signature = canonical(
    await provider.request({
      method: "personal_sign",
      params: [toHex(IDENTITY_MESSAGE), address],
    }),
  );
  const recovered = await recoverMessageAddress({
    message: IDENTITY_MESSAGE,
    signature,
  });
  if (recovered.toLowerCase() !== address.toLowerCase())
    throw new Error(
      "The account changed. Reconnect the original wallet and try again.",
    );
  const key = scalar(hexToBytes(sha256(signature)));
  const anchorKey = `tacit-ui:identity:${address.toLowerCase()}`;
  let anchor: string | null = null;
  try {
    anchor = localStorage.getItem(anchorKey);
  } catch {
    /* In-memory operation is supported. */
  }
  const fingerprint = keccak256(bytesToHex(key));
  if (anchor && fingerprint !== anchor)
    throw new Error(
      "This account derived a different key. Reconnect your original wallet or restore its recovery key.",
    );
  if (!anchor) {
    step("Sign once more to check wallet recovery");
    const again = canonical(
      await provider.request({
        method: "personal_sign",
        params: [toHex(IDENTITY_MESSAGE), address],
      }),
    );
    if (again !== signature)
      throw new Error(
        "This wallet signs differently each time. Use a recovery key so you can restore your funds.",
      );
    try {
      localStorage.setItem(anchorKey, fingerprint);
    } catch {
      /* Keys are never stored here. */
    }
  }
  return key;
}

export function validRecoveryKey(value: string) {
  const trimmed = value.trim().replace(/^0x/, "");
  if (!/^[\da-f]{64}$/i.test(trimmed)) return false;
  const n = BigInt(`0x${trimmed}`);
  return n > 0n && n < ORDER;
}
