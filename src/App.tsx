import { useEffect, useRef, useState } from "react";
import {
  useConnection,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
} from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatEther, isAddress, parseEther } from "viem";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Copy,
  Eye,
  EyeOff,
  Github,
  History,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Brand } from "./components/Brand";
import { Modal } from "./components/Modal";
import { PrivacyPanel } from "./components/PrivacyPanel";
import { Guide } from "./components/Guide";
import { Recovery } from "./components/Recovery";
import { ConnectSheet } from "./wallet/ConnectSheet";
import { NETWORKS } from "./wallet/config";
import type { NetworkId } from "./wallet/config";
import { usePrivateWallet, readableError } from "./protocol/usePrivateWallet";
import { IDENTITY_MESSAGE } from "./protocol/identity";

type Action = "Shield" | "Send" | "Withdraw";
type Page = "wallet" | "activity" | "guide";
type Transaction = {
  hash: string;
  action: Action;
  amount: string;
  network: NetworkId;
  date: Date;
  confirmed: boolean;
};
type Review = {
  action: Action;
  amount: bigint;
  recipient: string;
  fee: bigint;
  via: "self" | "relay";
};
const ACTIONS: Action[] = ["Shield", "Send", "Withdraw"];
const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
const displayEth = (value: bigint) => {
  const exact = formatEther(value);
  const [whole, fraction] = exact.split(".");
  if (!fraction) return whole;
  if (value > 0n && value < 10n ** 12n) return "<0.000001";
  return `${whole}.${fraction.slice(0, 6).replace(/0+$/, "") || "0"}`;
};
const initialPage = (): Page =>
  ["activity", "guide"].includes(location.hash.slice(1))
    ? (location.hash.slice(1) as Page)
    : "wallet";

export default function App() {
  const [page, setPage] = useState<Page>(initialPage);
  const [network, setNetwork] = useState<NetworkId>(1);
  const [action, setAction] = useState<Action>("Shield");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewAgreed, setReviewAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [transactionStep, setTransactionStep] = useState("");
  const [formError, setFormError] = useState("");
  const [errorField, setErrorField] = useState<"amount" | "recipient" | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [via, setVia] = useState<"relay" | "self">("relay");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Action | "All">("All");
  const amountRef = useRef<HTMLInputElement>(null);
  const recipientRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLHeadingElement>(null);
  const latestContext = useRef("");
  const { address, isConnected, chainId, connector } = useConnection();
  const { mutate: disconnect } = useDisconnect();
  const { mutateAsync: switchChain, isPending: switching } = useSwitchChain();
  // The wallet's own node reads its public balance. Pool-scanning RPCs are not sent the connected account.
  const publicBalance = useQuery({
    queryKey: ["funding-balance", address, network, chainId, connector?.uid],
    enabled: !!address && !!connector && chainId === network,
    staleTime: 20_000,
    queryFn: async () => {
      const provider =
        (await connector!.getProvider()) as import("./protocol/types").Provider;
      const result = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      if (typeof result !== "string" || !/^0x[\da-f]+$/i.test(result))
        throw new Error("Balance unavailable");
      return { value: BigInt(result) };
    },
  });
  const publicClient = usePublicClient({ chainId: network });
  const privacy = usePrivateWallet(network);
  const wrongChain = isConnected && chainId !== network;
  const busy = submitting || privacy.busy || quoting || switching;
  latestContext.current = `${address}:${network}:${connector?.uid}`;

  useEffect(() => {
    const change = () => {
      if (["#wallet", "#activity", "#guide"].includes(location.hash)) {
        setPage(initialPage());
        window.scrollTo(0, 0);
      }
    };
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    setReview(null);
    setReceiveOpen(false);
    setAccountOpen(false);
    setUnlockOpen(false);
    setRecoveryOpen(false);
    setFormError("");
    setLastHash(null);
    setNotice("");
    setSubmitting(false);
    setQuoting(false);
    setTransactionStep("");
    setTransactions([]); // Private amounts are held only for this account/network session.
  }, [address, network, connector?.uid]);

  function navigate(next: Page) {
    setPage(next);
    location.hash = next;
    window.scrollTo(0, 0);
    requestAnimationFrame(() =>
      (pageRef.current ?? document.getElementById("main-content"))?.focus(),
    );
  }
  function changeAction(next: Action) {
    setAction(next);
    setRecipient("");
    setFormError("");
    setErrorField(null);
    setNotice("");
    setLastHash(null);
  }
  async function switchNetwork() {
    setFormError("");
    try {
      await switchChain({ chainId: network });
    } catch {
      setFormError(
        `Unable to switch networks. Select ${NETWORKS[network].name} in your wallet and try again.`,
      );
    }
  }
  function startUnlock() {
    if (!isConnected) {
      setConnectOpen(true);
      return;
    }
    if (wrongChain) {
      void switchNetwork();
      return;
    }
    setUnlockOpen(true);
  }
  function failField(field: "amount" | "recipient", message: string) {
    setFormError(message);
    setErrorField(field);
    (field === "amount" ? amountRef : recipientRef).current?.focus();
  }
  async function prepareReview() {
    setFormError("");
    setErrorField(null);
    setNotice("");
    setLastHash(null);
    if (
      !/^(?:\d+\.?\d*|\.\d+)$/.test(amount.trim()) ||
      (amount.split(".")[1]?.length ?? 0) > 18
    ) {
      failField("amount", "Enter an ETH amount with up to 18 decimal places.");
      return;
    }
    let wei: bigint;
    try {
      wei = parseEther(amount.trim());
    } catch {
      failField("amount", "Enter a valid ETH amount.");
      return;
    }
    if (wei <= 0n) {
      failField("amount", "Enter an amount greater than zero.");
      return;
    }
    if (action === "Send" && !/^bp1[\da-z]{80,}$/i.test(recipient.trim())) {
      failField(
        "recipient",
        "Enter the recipient’s complete Tacit address, starting with bp1.",
      );
      return;
    }
    if (
      action === "Withdraw" &&
      (!isAddress(recipient.trim()) || BigInt(recipient.trim()) === 0n)
    ) {
      failField("recipient", "Enter a valid, nonzero Ethereum address.");
      return;
    }
    if (!isConnected) {
      setConnectOpen(true);
      return;
    }
    if (wrongChain) {
      await switchNetwork();
      return;
    }
    if (!privacy.wallet) {
      setUnlockOpen(true);
      return;
    }
    if (!privacy.summary) {
      setFormError("Refresh your private balance before continuing.");
      return;
    }
    const available =
      action === "Shield" ? publicBalance.data?.value : privacy.summary.balance;
    if (available !== undefined && wei > available) {
      failField(
        "amount",
        "This amount exceeds your available balance. Enter a smaller amount.",
      );
      return;
    }
    const context = latestContext.current;
    setQuoting(true);
    try {
      let fee = 0n;
      if (action !== "Shield" && via === "relay") {
        const quote = await privacy.wallet.quote();
        fee = BigInt(quote.fee);
        if (wei + fee > privacy.summary.balance) {
          failField(
            "amount",
            `Leave ${formatEther(fee)} ETH for the relay fee, or choose a smaller amount.`,
          );
          return;
        }
      }
      if (context !== latestContext.current) return;
      setReviewAgreed(false);
      setReview({
        action,
        amount: wei,
        recipient: recipient.trim(),
        fee,
        via: action === "Shield" ? "self" : via,
      });
    } catch (error) {
      if (context === latestContext.current)
        setFormError(
          `${readableError(error)} You can also choose “My wallet” under transaction options.`,
        );
    } finally {
      if (context === latestContext.current) setQuoting(false);
    }
  }
  async function submitTransaction() {
    if (!review || !privacy.wallet || submitting || !reviewAgreed || wrongChain)
      return;
    const operation = review;
    const context = latestContext.current;
    const privateWallet = privacy.wallet;
    setSubmitting(true);
    setFormError("");
    setTransactionStep("Preparing your transaction");
    try {
      const options = {
        via: operation.via,
        maxFee: operation.fee,
        onStep: (step: string) => {
          if (context === latestContext.current)
            setTransactionStep(step.charAt(0).toUpperCase() + step.slice(1));
        },
      };
      const hash =
        operation.action === "Shield"
          ? await privateWallet.deposit(operation.amount, options)
          : operation.action === "Send"
            ? await privateWallet.send(
                operation.recipient,
                operation.amount,
                options,
              )
            : await privateWallet.withdraw(
                operation.recipient,
                operation.amount,
                options,
              );
      if (context !== latestContext.current) return;
      const receipt = await publicClient
        ?.getTransactionReceipt({ hash })
        .catch(() => null);
      if (context !== latestContext.current) return;
      const confirmed = receipt?.status === "success";
      setTransactions((previous) => [
        {
          hash,
          action: operation.action,
          amount: formatEther(operation.amount),
          network,
          date: new Date(),
          confirmed,
        },
        ...previous,
      ]);
      setReview(null);
      setLastHash(hash);
      setNotice(
        receipt?.status === "reverted"
          ? "The transaction reverted. Check its details before trying again."
          : confirmed
            ? `${operation.action === "Shield" ? "Deposit" : operation.action === "Send" ? "Private payment" : "Withdrawal"} confirmed on ${NETWORKS[network].name}.`
            : "Transaction submitted. Confirmation is not verified; check the explorer before sending again.",
      );
      setAmount("");
      setRecipient("");
      void privacy.refresh();
      void publicBalance.refetch();
    } catch (error) {
      if (context === latestContext.current) {
        setReview(null);
        setFormError(readableError(error));
      }
    } finally {
      if (context === latestContext.current) {
        setSubmitting(false);
        setTransactionStep("");
      }
    }
  }
  function setPortion(percent: number) {
    const source =
      action === "Shield"
        ? publicBalance.data?.value
        : privacy.summary?.balance;
    if (source === undefined) {
      setNotice("Connect and unlock your wallet to use a balance shortcut.");
      return;
    }
    // Keep a conservative gas reserve for deposits; the wallet shows the exact gas fee before signing.
    const reserve =
      action === "Shield" ? (network === 1 ? 3n * 10n ** 15n : 10n ** 14n) : 0n;
    setAmount(
      formatEther(
        ((source > reserve ? source - reserve : 0n) * BigInt(percent)) / 100n,
      ),
    );
    setFormError("");
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Address copied.");
    } catch {
      setNotice("Copy is unavailable. Select and copy the full address below.");
    }
  }

  const activity = (compact = false) => {
    const visible = transactions.filter(
      (tx) => filter === "All" || tx.action === filter,
    );
    return (
      <section
        className={`activity-section ${compact ? "compact-activity" : ""}`}
      >
        <div className="section-heading">
          <div>
            <h2>{compact ? "Recent activity" : "Your activity"}</h2>
            {!compact && (
              <p className="muted">
                Transactions made here, during this session.
              </p>
            )}
          </div>
          {compact && (
            <button
              className="text-button"
              onClick={() => navigate("activity")}
            >
              View activity <ArrowUpRight size={16} />
            </button>
          )}
        </div>
        {!compact && (
          <div className="activity-filters" aria-label="Filter activity">
            {(["All", ...ACTIONS] as const).map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {visible.length ? (
          <div className="activity-list">
            {visible.slice(0, compact ? 3 : 50).map((tx) => (
              <div className="activity-row" key={tx.hash}>
                <span className="activity-icon">
                  {tx.action === "Shield" ? (
                    <ArrowDownLeft size={20} />
                  ) : (
                    <ArrowUpRight size={20} />
                  )}
                </span>
                <div>
                  <strong>
                    {tx.action === "Shield"
                      ? "Shield ETH"
                      : tx.action === "Send"
                        ? "Private payment"
                        : "Withdraw ETH"}
                  </strong>
                  <span className="small muted">
                    {tx.date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {NETWORKS[tx.network].name}
                  </span>
                </div>
                <span className="activity-amount">
                  {hidden ? "••••" : tx.amount} ETH
                  <span className="small muted">
                    {tx.confirmed ? "Confirmed" : "Check explorer"}
                  </span>
                </span>
                <a
                  className="icon-button"
                  aria-label={`View ${tx.action.toLowerCase()} transaction`}
                  href={`${NETWORKS[tx.network].explorer}/tx/${tx.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ArrowUpRight size={18} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="activity-empty">
            <span className="empty-icon">
              <History size={22} />
            </span>
            <div>
              <h3>
                {filter === "All"
                  ? "A clean slate."
                  : `No ${filter.toLowerCase()} activity.`}
              </h3>
              <p>
                {filter === "All"
                  ? "Transactions you make in this session will appear here."
                  : "Try another filter to see your session’s transactions."}
              </p>
            </div>
            {filter !== "All" && (
              <button className="text-button" onClick={() => setFilter("All")}>
                Clear filter
              </button>
            )}
          </div>
        )}
        {!compact && (
          <p className="small muted activity-note">
            Activity is kept in memory, never sent to an analytics service. Your
            balance is recovered from the pool; this session list is cleared
            when you leave or change accounts or networks.
          </p>
        )}
      </section>
    );
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <nav className="main-nav" aria-label="Main navigation">
          <a
            href="#wallet"
            className={page === "wallet" ? "active" : ""}
            aria-current={page === "wallet" ? "page" : undefined}
            onClick={() => navigate("wallet")}
          >
            <Shield size={19} />
            <span>Privacy wallet</span>
            {page === "wallet" && <span className="nav-indicator" />}
          </a>
          <a
            href="#activity"
            className={page === "activity" ? "active" : ""}
            aria-current={page === "activity" ? "page" : undefined}
            onClick={() => navigate("activity")}
          >
            <History size={19} />
            <span>Activity</span>
          </a>
          <a
            href="#guide"
            className={page === "guide" ? "active" : ""}
            aria-current={page === "guide" ? "page" : undefined}
            onClick={() => navigate("guide")}
          >
            <BookOpen size={19} />
            <span>How it works</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="ecosystem">
            <p>More from Tacit</p>
            <a
              href="https://tacit.finance/sats/"
              target="_blank"
              rel="noreferrer"
            >
              Private Bitcoin <ArrowUpRight size={15} />
            </a>
            <a
              href="https://tacit.finance/#card=swap"
              target="_blank"
              rel="noreferrer"
            >
              Confidential DeFi <ArrowUpRight size={15} />
            </a>
          </div>
          <a
            className="sidebar-source"
            href="https://github.com/z0r0z/tacit"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={17} /> Open source <ArrowUpRight size={14} />
          </a>
          <div className="sidebar-signoff">
            <span className="small-lock">
              <LockKeyhole size={13} />
            </span>
            <span>
              Your keys stay
              <br />
              <strong>in your hands.</strong>
            </span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Brand small />
          </div>
          <div className="breadcrumb">
            <span>Tacit</span>
            <span>/</span>
            <span>
              {page === "wallet"
                ? "Privacy wallet"
                : page === "activity"
                  ? "Activity"
                  : "How it works"}
            </span>
          </div>
          <div className="header-controls">
            <label className="network-select">
              <span className="sr-only">Network</span>
              <span
                className={`network-symbol ${network === 8453 ? "base-symbol" : ""}`}
                aria-hidden="true"
              >
                {network === 1 ? <EthIcon /> : <span />}
              </span>
              <select
                aria-label="Network"
                value={network}
                disabled={busy}
                onChange={(event) =>
                  setNetwork(Number(event.target.value) as NetworkId)
                }
              >
                <option value={1}>Ethereum</option>
                <option value={8453}>Base</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <button
              className={`connect-button ${isConnected ? "connected" : ""}`}
              onClick={() =>
                isConnected
                  ? wrongChain
                    ? void switchNetwork()
                    : setAccountOpen(true)
                  : setConnectOpen(true)
              }
              disabled={submitting || switching}
            >
              <span className="wallet-button-icon">
                <Wallet size={16} />
              </span>
              {switching
                ? "Switching…"
                : isConnected && address
                  ? wrongChain
                    ? `Switch to ${NETWORKS[network].name}`
                    : short(address)
                  : "Connect"}
              {isConnected && !wrongChain && <ChevronDown size={13} />}
            </button>
          </div>
        </header>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {(
            [
              ["wallet", "Wallet"],
              ["activity", "Activity"],
              ["guide", "Guide"],
            ] as const
          ).map(([key, label]) => (
            <a
              key={key}
              href={`#${key}`}
              className={page === key ? "active" : ""}
              aria-current={page === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              {label}
            </a>
          ))}
        </nav>

        <main id="main-content" className="main-content" tabIndex={-1}>
          {page === "wallet" ? (
            <>
              <div className="page-heading wallet-heading">
                <div>
                  <h1 ref={pageRef} tabIndex={-1}>
                    Your money.
                    <br className="mobile-break" /> <em>Your business.</em>
                  </h1>
                  <p>A self-custody wallet for private ETH.</p>
                </div>
                <div className="self-custody">
                  <ShieldCheck size={16} />
                  <span>Built for your privacy</span>
                </div>
              </div>
              <div className="wallet-grid">
                <section
                  className="transaction-panel"
                  aria-label="Privacy wallet"
                >
                  <div className="transaction-header">
                    <div>
                      <h2>Move in private</h2>
                      <span className="small muted">
                        Your ETH, on your terms.
                      </span>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="How privacy works"
                      onClick={() => navigate("guide")}
                    >
                      <CircleHelp size={19} />
                    </button>
                  </div>
                  <div
                    className="action-tabs"
                    role="tablist"
                    aria-label="Transaction type"
                  >
                    {ACTIONS.map((item, i) => (
                      <button
                        key={item}
                        id={`tab-${item}`}
                        role="tab"
                        aria-selected={action === item}
                        aria-controls="transaction-form"
                        tabIndex={action === item ? 0 : -1}
                        className={action === item ? "selected" : ""}
                        onClick={() => changeAction(item)}
                        onKeyDown={(event) => {
                          if (
                            ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                              event.key,
                            )
                          ) {
                            event.preventDefault();
                            const next =
                              event.key === "Home"
                                ? 0
                                : event.key === "End"
                                  ? 2
                                  : (i + (event.key === "ArrowRight" ? 1 : 2)) %
                                    3;
                            changeAction(ACTIONS[next]);
                            document
                              .getElementById(`tab-${ACTIONS[next]}`)
                              ?.focus();
                          }
                        }}
                      >
                        {item === "Shield" ? (
                          <Plus size={16} />
                        ) : item === "Send" ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownLeft size={16} />
                        )}
                        {item}
                      </button>
                    ))}
                  </div>
                  <form
                    id="transaction-form"
                    role="tabpanel"
                    aria-labelledby={`tab-${action}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void prepareReview();
                    }}
                    noValidate
                  >
                    <div className="amount-block">
                      <div className="field-topline">
                        <label htmlFor="amount">
                          {action === "Shield"
                            ? "You shield"
                            : action === "Send"
                              ? "You send"
                              : "You withdraw"}
                        </label>
                        <span className="small muted">
                          {action === "Shield"
                            ? "From your wallet"
                            : "From private balance"}
                        </span>
                      </div>
                      <div className="amount-entry">
                        <input
                          ref={amountRef}
                          id="amount"
                          name="amount"
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          autoComplete="off"
                          value={amount}
                          onChange={(event) => {
                            setAmount(event.target.value);
                            setFormError("");
                            setErrorField(null);
                          }}
                          aria-invalid={errorField === "amount"}
                          aria-describedby="form-error amount-hint"
                          disabled={busy}
                        />
                        <div className="asset-label">
                          <span className="eth-asset">
                            <EthIcon />
                          </span>
                          <span>ETH</span>
                        </div>
                      </div>
                      <div className="amount-bottom">
                        <span id="amount-hint" className="small muted">
                          {action === "Shield"
                            ? address
                              ? publicBalance.data
                                ? `Balance: ${hidden ? "••••" : displayEth(publicBalance.data.value)} ETH`
                                : publicBalance.isError
                                  ? "Balance unavailable"
                                  : "Reading balance…"
                              : "Connect to view balance"
                            : privacy.summary
                              ? `Available: ${hidden ? "••••" : displayEth(privacy.summary.balance)} ETH`
                              : "Unlock to view balance"}
                        </span>
                        <div className="portion-buttons">
                          <button
                            type="button"
                            onClick={() => setPortion(25)}
                            disabled={busy}
                          >
                            25%
                          </button>
                          <button
                            type="button"
                            onClick={() => setPortion(50)}
                            disabled={busy}
                          >
                            50%
                          </button>
                        </div>
                      </div>
                    </div>
                    {action === "Shield" ? (
                      <div className="destination">
                        <span className="flow-arrow">
                          <ArrowDown size={16} />
                        </span>
                        <div className="destination-info">
                          <span className="destination-icon">
                            <LockKeyhole size={18} />
                          </span>
                          <div>
                            <span>Your private balance</span>
                            <span className="small muted">
                              Only your key can spend it
                            </span>
                          </div>
                          <ShieldCheck
                            size={18}
                            className="destination-check"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="recipient-field">
                        <label htmlFor="recipient">
                          {action === "Send"
                            ? "Tacit recipient address"
                            : "Public recipient address"}
                        </label>
                        <input
                          ref={recipientRef}
                          id="recipient"
                          name="recipient"
                          className="text-input"
                          value={recipient}
                          onChange={(event) => {
                            setRecipient(event.target.value);
                            setFormError("");
                            setErrorField(null);
                          }}
                          placeholder={action === "Send" ? "bp1…" : "0x…"}
                          spellCheck={false}
                          autoComplete="off"
                          aria-invalid={errorField === "recipient"}
                          aria-describedby="form-error recipient-hint"
                          disabled={busy}
                        />
                        <span id="recipient-hint" className="small muted">
                          {action === "Send"
                            ? "Use their full private address."
                            : "Withdrawals make this address and amount public."}
                        </span>
                      </div>
                    )}
                    <div className="transaction-cost">
                      <span>
                        {action === "Shield"
                          ? "Network fee"
                          : via === "relay"
                            ? "Relay fee"
                            : "Network fee"}
                      </span>
                      <span>
                        {action === "Shield" || via === "self"
                          ? "Shown in your wallet"
                          : "Quoted before you confirm"}
                        <button
                          type="button"
                          className="inline-help"
                          aria-label="About transaction fees"
                          onClick={() => navigate("guide")}
                        >
                          <CircleHelp size={13} />
                        </button>
                      </span>
                    </div>
                    {action !== "Shield" && (
                      <details className="transaction-options">
                        <summary>Transaction options</summary>
                        <label htmlFor="submission-route">
                          Send transaction with
                        </label>
                        <select
                          id="submission-route"
                          value={via}
                          disabled={busy}
                          onChange={(event) =>
                            setVia(event.target.value as "self" | "relay")
                          }
                        >
                          <option value="relay">
                            Relay · fee from private balance
                          </option>
                          <option value="self">
                            My wallet · pay network gas
                          </option>
                        </select>
                        <p className="small muted">
                          A relay keeps your wallet address out of the
                          transaction. Sending from your wallet makes its
                          participation public.
                        </p>
                      </details>
                    )}
                    <p id="form-error" className="error-message" role="status">
                      {formError}
                    </p>
                    {wrongChain ? (
                      <button
                        className="primary full"
                        type="button"
                        onClick={() => void switchNetwork()}
                        disabled={busy}
                      >
                        Switch to {NETWORKS[network].name}
                        <ArrowRight size={17} />
                      </button>
                    ) : (
                      <button
                        className="primary full"
                        type="submit"
                        disabled={busy}
                      >
                        {busy ? (
                          <LoaderCircle size={17} className="spinner" />
                        ) : (
                          <LockKeyhole size={17} />
                        )}
                        {quoting
                          ? "Getting relay fee…"
                          : submitting
                            ? "Transaction in progress…"
                            : privacy.busy
                              ? "Opening private wallet…"
                              : `${action} ETH`}
                        {!busy && (
                          <ArrowRight size={17} className="button-end-icon" />
                        )}
                      </button>
                    )}
                    <p className="form-footnote">
                      <ShieldCheck size={13} />
                      {action === "Shield"
                        ? "Deposits are public; transfers stay private."
                        : action === "Send"
                          ? "Private amount and recipient."
                          : "Your source note stays private."}
                    </p>
                  </form>
                  <div className="private-balance">
                    <div>
                      <LockKeyhole size={15} />
                      <span>Private balance</span>
                      <button
                        className="icon-button"
                        aria-label={hidden ? "Show balances" : "Hide balances"}
                        onClick={() => setHidden(!hidden)}
                      >
                        {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {privacy.wallet ? (
                      <div className="balance-actions">
                        <strong
                          title={
                            privacy.summary
                              ? `${formatEther(privacy.summary.balance)} ETH`
                              : undefined
                          }
                        >
                          {privacy.summary
                            ? `${hidden ? "••••" : displayEth(privacy.summary.balance)} ETH`
                            : "Not synced"}
                        </strong>
                        <button
                          className="icon-button"
                          disabled={busy}
                          onClick={() => void privacy.refresh()}
                          aria-label="Refresh private balance"
                        >
                          <RefreshCw size={15} />
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setReceiveOpen(true)}
                          disabled={busy}
                        >
                          Receive
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={startUnlock}
                      >
                        {isConnected
                          ? "Unlock wallet"
                          : "Unlock after connecting"}
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </section>
                <PrivacyPanel onLearn={() => navigate("guide")} />
              </div>
              <div className="status-region" role="status">
                {privacy.step || notice}
                {lastHash && (
                  <a
                    href={`${NETWORKS[network].explorer}/tx/${lastHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View transaction <ArrowUpRight size={14} />
                  </a>
                )}
              </div>
              {privacy.error && (
                <div className="network-error" role="alert">
                  <span>{privacy.error}</span>
                  <button
                    className="text-button"
                    onClick={() => void privacy.refresh()}
                    disabled={busy}
                  >
                    Retry <RefreshCw size={14} />
                  </button>
                </div>
              )}
              {activity(true)}
              <div className="trust-footer">
                <span>
                  <LockKeyhole size={14} /> Self-custody by design
                </span>
                <span>
                  <ShieldCheck size={14} /> Proved on your device
                </span>
                <a
                  href="https://github.com/z0r0z/tacit"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github size={14} /> Open for inspection{" "}
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </>
          ) : page === "activity" ? (
            <>
              <div className="page-heading">
                <h1 ref={pageRef} tabIndex={-1}>
                  A private paper trail.
                </h1>
                <p>Your transactions, kept on this device for this session.</p>
              </div>
              {activity()}
              <button className="secondary" onClick={() => navigate("wallet")}>
                <Plus size={17} /> Make a transaction
              </button>
            </>
          ) : (
            <Guide network={network} />
          )}
        </main>
        <footer className="page-footer">
          <span>Less exposure. More ownership.</span>
          <div>
            <a
              href="https://github.com/z0r0z/tacit/blob/main/SECURITY.md"
              target="_blank"
              rel="noreferrer"
            >
              Security <ArrowUpRight size={12} />
            </a>
            <span>Tacit protocol</span>
          </div>
        </footer>
      </div>
      {connectOpen && <ConnectSheet onClose={() => setConnectOpen(false)} />}
      {accountOpen && address && (
        <Modal
          title="Your connected wallet"
          onClose={() => setAccountOpen(false)}
        >
          <p className="small muted">Connected to {NETWORKS[network].name}</p>
          <div className="address-display">
            <code>{address}</code>
            <button
              className="icon-button"
              aria-label="Copy wallet address"
              onClick={() => void copy(address)}
            >
              <Copy size={17} />
            </button>
          </div>
          <div className="account-actions">
            <button
              className="wallet-row"
              onClick={() => {
                setAccountOpen(false);
                setRecoveryOpen(true);
              }}
              disabled={!privacy.wallet || busy}
            >
              <KeyRound size={19} /> Back up recovery key{" "}
              <ArrowRight size={16} />
            </button>
            <button
              className="wallet-row"
              onClick={() => {
                privacy.lock();
                setAccountOpen(false);
              }}
              disabled={!privacy.wallet || busy}
            >
              <LockKeyhole size={19} /> Lock private wallet
            </button>
            <button
              className="wallet-row"
              onClick={() => {
                privacy.lock();
                disconnect();
                setAccountOpen(false);
              }}
              disabled={submitting}
            >
              <LogOut size={19} /> Disconnect
            </button>
          </div>
          <p className="small muted" role="status">
            {notice}
          </p>
        </Modal>
      )}
      {unlockOpen && (
        <Modal
          title="Open your private wallet"
          busy={privacy.busy}
          onClose={() => setUnlockOpen(false)}
        >
          <div className="modal-symbol">
            <LockKeyhole size={24} />
          </div>
          <p className="modal-description">
            Sign the Tacit identity message to find your notes. This signature
            creates your private key; it does not send a transaction.
          </p>
          <details className="identity-details">
            <summary>Read the identity message</summary>
            <pre>{IDENTITY_MESSAGE}</pre>
          </details>
          <p className="small muted">
            Sign only in a Tacit app you trust. Anyone with the signature can
            spend your Tacit funds.
          </p>
          <button
            className="primary full"
            disabled={privacy.busy}
            onClick={async () => {
              if (await privacy.unlock()) setUnlockOpen(false);
            }}
          >
            {privacy.busy ? (
              <LoaderCircle size={17} className="spinner" />
            ) : (
              <Wallet size={17} />
            )}
            {privacy.busy ? "Opening private wallet…" : "Sign to unlock"}
          </button>
          <p className="small muted" role="status">
            {privacy.step}
          </p>
          <p className="error-message" role="alert">
            {privacy.error}
          </p>
          <button
            className="text-button recovery-link"
            disabled={privacy.busy}
            onClick={() => {
              setUnlockOpen(false);
              setRecoveryOpen(true);
            }}
          >
            <KeyRound size={16} /> Recovery key
          </button>
        </Modal>
      )}
      {recoveryOpen && (
        <Recovery
          existing={privacy.recovery()}
          onClose={() => setRecoveryOpen(false)}
          onImport={(key) => {
            setRecoveryOpen(false);
            void privacy.unlock(key);
          }}
        />
      )}
      {receiveOpen && privacy.wallet && (
        <Modal title="Receive privately" onClose={() => setReceiveOpen(false)}>
          <div className="modal-symbol">
            <ArrowDownLeft size={24} />
          </div>
          <p className="modal-description">
            Share your Tacit address to receive private ETH from another Tacit
            wallet on {NETWORKS[network].name}.
          </p>
          <label htmlFor="private-address">Your private Tacit address</label>
          <textarea
            id="private-address"
            className="address-textarea"
            value={privacy.wallet.address}
            readOnly
            rows={4}
          />
          <button
            className="primary full"
            onClick={() => void copy(privacy.wallet!.address)}
          >
            <Copy size={17} /> Copy private address
          </button>
          <p className="small muted" role="status">
            {notice}
          </p>
          <p className="small muted">
            Only send from a compatible Tacit wallet on the same network. This
            address is not an Ethereum address.
          </p>
        </Modal>
      )}
      {review && (
        <Modal
          title={`Review ${review.action.toLowerCase()}`}
          busy={submitting}
          onClose={() => setReview(null)}
        >
          <div className="review-amount">
            {formatEther(review.amount)} <span>ETH</span>
          </div>
          <dl className="review-details">
            <div>
              <dt>Network</dt>
              <dd>{NETWORKS[network].name}</dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>
                {review.action === "Shield" ? (
                  "Your private balance"
                ) : (
                  <code>{review.recipient}</code>
                )}
              </dd>
            </div>
            <div>
              <dt>
                {review.via === "relay"
                  ? "Maximum fee per transaction"
                  : "Network fee"}
              </dt>
              <dd>
                {review.via === "relay"
                  ? `${formatEther(review.fee)} ETH`
                  : "Confirm in your wallet"}
              </dd>
            </div>
            {review.via === "relay" && (
              <div>
                <dt>Amount + one relay fee</dt>
                <dd>{formatEther(review.amount + review.fee)} ETH</dd>
              </div>
            )}
          </dl>
          {review.action !== "Shield" &&
            privacy.summary &&
            privacy.summary.notes > 2 && (
              <p className="small muted">
                Combining notes may require extra transactions. Each pays{" "}
                {review.via === "relay"
                  ? "up to the relay fee shown above"
                  : "network gas in your wallet"}{" "}
                before the payment is sent.
              </p>
            )}
          <p className="review-disclosure">
            {review.action === "Shield"
              ? "Your wallet address and deposit amount will be public."
              : review.action === "Withdraw"
                ? "The recipient address and withdrawal amount will be public."
                : "The payment amount and recipient stay private."}
            {review.via === "self" && review.action !== "Shield"
              ? " Your wallet will appear as the transaction sender."
              : ""}
          </p>
          <p className="small muted">
            On first use, about 33 MB of public proving files download to this
            device. The proof is built locally.
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={reviewAgreed}
              disabled={submitting}
              onChange={(event) => setReviewAgreed(event.target.checked)}
            />
            <span>
              I understand this is experimental software and I can recover my
              private wallet.
            </span>
          </label>
          <button
            className="primary full"
            disabled={!reviewAgreed || submitting || wrongChain}
            onClick={() => void submitTransaction()}
          >
            {submitting ? (
              <LoaderCircle className="spinner" size={17} />
            ) : (
              <ShieldCheck size={17} />
            )}
            {submitting
              ? "Transaction in progress…"
              : `Confirm ${review.action.toLowerCase()}`}
          </button>
          <p className="small muted" role="status">
            {transactionStep}
          </p>
          {submitting && (
            <p className="small muted">
              Keep this page open while the proof and transaction complete.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

function EthIcon() {
  return (
    <svg
      viewBox="0 0 16 24"
      width="12"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 0L.5 12.3 8 16.7l7.5-4.4L8 0Z"
        fill="currentColor"
        opacity=".9"
      />
      <path
        d="M8 18.1.5 13.7 8 24l7.5-10.3L8 18.1Z"
        fill="currentColor"
        opacity=".7"
      />
      <path d="M8 0v16.7l7.5-4.4L8 0Z" fill="currentColor" opacity=".45" />
    </svg>
  );
}
