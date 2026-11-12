import {
  ArrowDownLeft,
  ArrowUpRight,
  KeyRound,
  LockKeyhole,
} from "lucide-react";
import { POOL, ROUTER, NETWORKS } from "../wallet/config";
import type { NetworkId } from "../wallet/config";

export function Guide({ network }: { network: NetworkId }) {
  return (
    <section className="guide-page">
      <div className="page-heading">
        <h1>Privacy, in plain sight.</h1>
        <p>Know what stays private, and what goes onchain.</p>
      </div>
      <div className="guide-intro">
        <LockKeyhole size={28} />
        <div>
          <h2>A shared pool. Your own keys.</h2>
          <p>
            Tacit turns ETH into private notes. Zero-knowledge proofs let you
            spend a note without revealing which deposit it came from. You keep
            control of your funds.
          </p>
        </div>
      </div>
      <div className="guide-steps">
        <article>
          <ArrowDownLeft size={24} />
          <h2>1. Shield</h2>
          <p>
            Move ETH from your wallet into the pool. Your depositing address and
            the amount are public.
          </p>
        </article>
        <article>
          <LockKeyhole size={24} />
          <h2>2. Send privately</h2>
          <p>
            Pay a Tacit address inside the pool. The payment amount and the link
            between sender and recipient stay hidden.
          </p>
        </article>
        <article>
          <ArrowUpRight size={24} />
          <h2>3. Withdraw</h2>
          <p>
            Move ETH to a public address. That address and the withdrawn amount
            are public; the note that funded it stays hidden.
          </p>
        </article>
      </div>
      <section className="guide-details">
        <h2>The details matter.</h2>
        <details open>
          <summary>Privacy has boundaries</summary>
          <p>
            Timing, amounts and a small pool can make deposits and withdrawals
            easier to correlate. RPC providers and relayers can see your IP
            address. Tacit provides transaction privacy, not anonymity from
            every observer.
          </p>
        </details>
        <details>
          <summary>Prove on your device</summary>
          <p>
            The first transaction downloads about 33 MB of public proving files.
            The wallet checks their pinned hashes and creates the proof in your
            browser. Your private key stays on this device.
          </p>
        </details>
        <details>
          <summary>Relay or send from your wallet</summary>
          <p>
            Private sends and withdrawals can use a relayer, with its fee
            included in the proof. Sending from your own wallet pays network gas
            and publicly links that wallet to the transaction. Deposits always
            come from your wallet.
          </p>
        </details>
        <details>
          <summary>Recovery is your responsibility</summary>
          <p>
            An Ethereum account restores its Tacit key by signing the same
            identity message. Contract wallets use a separate recovery key.
            Anyone with this key or your identity signature controls your Tacit
            funds. Keep a backup somewhere safe.
          </p>
        </details>
        <details>
          <summary>Experimental software and protocol risk</summary>
          <p>
            Tacit uses immutable contracts, zero-knowledge cryptography and a
            trusted-setup ceremony. These can contain defects. Only use funds
            you can afford to lose, and read the upstream security documentation
            before depositing.
          </p>
        </details>
      </section>
      <section className="contract-section">
        <h2>Verify, then trust.</h2>
        <p>
          ETH pool contracts on {NETWORKS[network].name}. These are the
          addresses used by this app.
        </p>
        <div className="contract-row">
          <span>Pool</span>
          <a
            href={`${NETWORKS[network].explorer}/address/${POOL}`}
            target="_blank"
            rel="noreferrer"
          >
            <code>{POOL}</code>
            <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="contract-row">
          <span>Router</span>
          <a
            href={`${NETWORKS[network].explorer}/address/${ROUTER}`}
            target="_blank"
            rel="noreferrer"
          >
            <code>{ROUTER}</code>
            <ArrowUpRight size={16} />
          </a>
        </div>
        <a
          className="text-link"
          href="https://github.com/z0r0z/tacit/blob/main/docs/EVM-POOL.md"
          target="_blank"
          rel="noreferrer"
        >
          Read the protocol documentation <ArrowUpRight size={16} />
        </a>
      </section>
      <div className="guide-bottom">
        <KeyRound size={20} />
        <span>No account. No custodian. Just your keys.</span>
      </div>
    </section>
  );
}
