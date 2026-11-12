# Tacit

A cleaner privacy-wallet interface for [z0r0z/tacit](https://github.com/z0r0z/tacit): warm paper, dark ink and one clear transaction surface. Shield, send, receive and withdraw native ETH on Ethereum or Base. The Bitcoin and confidential DeFi applications remain linked to the upstream site.

This is a working React/TypeScript frontend, using Tacit’s original standalone EVM wallet for keys, note recovery, proofs and transaction construction. No sample balances, synthetic “live” metrics or demo activity are used in the application.

## Install and run

Use Node 22.12+ (Node 24 was used for validation) and npm.

```sh
npm ci
npm run dev
```

To check and rebuild the committed static export:

```sh
npm run typecheck
npm run build
npm run preview
```

Vite prints the local preview address. Serve the contents of `dist/` over HTTP(S); opening `index.html` as a `file:` URL does not support the module and wallet flows. `base: './'`, relative asset URLs and hash routes (`#wallet`, `#activity`, `#guide`) support static gateway subpaths. No backend, environment file, private credential or wallet project ID is needed.

`dist/` is deliberately included beside the source and `package-lock.json`. The host serves this export without rebuilding it. Re-run the build after changing application source or `public/` assets.

## Wallet and privacy behavior

- One Connect control discovers browser wallets through EIP-6963. A phone without an injected wallet offers MetaMask, Coinbase Wallet, Rabby and Phantom app links, plus Coinbase Smart Wallet. The wallet SDK loads when selected; no WalletConnect relay is configured.
- An Ethereum account unlocks its Tacit identity with the exact upstream message. Canonical signature checks, recovered-account verification, a first-use repeat signature and a local fingerprint protect recovery consistency. The signature/key can spend Tacit funds; the UI explains this before signing.
- Contract wallets use a separately created or imported recovery key. Creating one requires explicitly saving it before opening the wallet. A backup download and restore flow are available; no private key is persisted by this UI.
- Deposits and withdrawal boundaries are public. Private sends hide amounts and the sender/recipient link. Relayed sends have a fee from the private balance; self-submitted sends expose the funding wallet’s participation. The review shows the chosen route and fee, and explains extra fees if notes need combining.
- Public funding balances are read through the connected wallet’s provider. The pool-scanning RPCs are not given the connected address for a funding-balance read. RPCs and relayers still see network metadata such as IP addresses.
- Only an observed successful receipt receives a Confirmed label. Unverified submissions link to the explorer. Activity is limited to the current account/network session, held in memory; it is not a complete chain history.
- Disconnecting, locking, changing accounts or changing the selected network clears the active private wallet. The upstream library may retain encrypted note state in local storage. Restore with the original account signature or your recovery key.

Read the in-app Guide and [upstream EVM pool documentation](https://github.com/z0r0z/tacit/blob/main/docs/EVM-POOL.md) before using real funds. This interface does not constitute a protocol security audit.

## Runtime assets and protocol provenance

The local wallet module, verification key and proof pins come from upstream commit `c61a8e5f9d27a738bacc34765286a745d86d0f19`. `public/protocol/NOTICE.md` records its path and actual SHA-256. The module is preserved byte for byte; contract addresses, chain IDs, deployment blocks and proof construction are unchanged.

Fonts, icons, favicon, share image, wallet runtime and verification key are bundled locally. Proving additionally needs two public files: `transact.wasm` (4,916,992 bytes) and `transact_final.zkey` (28,558,285 bytes). Their 33,475,277-byte total exceeds the entire 8 MiB submission budget, so the first proof downloads them from Tacit, with a fallback to the pinned GitHub commit. This dependency is visible before confirmation. The original wallet checks both SHA-256 hashes and the verification-key hash, then proves and verifies locally in a Blob worker. There is no hosted private prover and no private key leaves the browser. If these sources or the chain are unreachable, the transaction cannot complete; the UI offers a recoverable error.

The static interface works without these downloads. Balances and transactions require network access, a compatible wallet and the deployed pool. The large proof files are not misrepresented as part of the offline export.

## Validation

Worker validation on 2026-11-12:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; complete static export generated |
| `npm run test:ui` with pinned proof files | Passed, including a real local Groth16 proof and rejecting mock signer |
| Pinned taste@1 design probe | 16/16 passed |
| Chromium responsive checks | Wallet, activity and guide at 320, 390, 640, 768, 860, 1024 and 1440px; no horizontal overflow |
| 390×844 first screen | Product and Shield action visible; action bottom y=714 |
| Accessibility automation | No axe WCAG A/AA violations in all three form states, wallet dialog and guide |
| Recovery / wallets | Named discovery, missing-extension error, signature rejection/retry, real identity, backup/restore, account reset, switch and add-network fallback passed with a test provider |

The suite serves the actual `dist/` under `/preview/` in a bounded foreground process and closes its server/browser afterward. To repeat it:

```sh
npx playwright install chromium
npm run build
npm run test:ui
```

For the additional real-proof smoke test, obtain the pinned public files and set their folder:

```sh
mkdir -p test/scratch/proving
curl -fL https://raw.githubusercontent.com/z0r0z/tacit/c61a8e5f9d27a738bacc34765286a745d86d0f19/dapp/evm-pool/transact.wasm -o test/scratch/proving/transact.wasm
curl -fL https://raw.githubusercontent.com/z0r0z/tacit/c61a8e5f9d27a738bacc34765286a745d86d0f19/dapp/evm-pool/transact_final.zkey -o test/scratch/proving/transact_final.zkey
CHECK_PROOF_ARTIFACTS=test/scratch/proving npm run test:ui
```

The test creates an ephemeral signing account, synthetic chain reads and a mock wallet that rejects transaction submission. It actually generates and locally verifies the proof, then checks the pool address, ETH value and encoded calldata. It never broadcasts a real transaction. With the setting omitted, this expensive subcheck is explicitly marked unperformed.

The supplied browser launcher could not find its Chrome distribution. Validation used a locally installed Playwright Chromium instead. WebKit was downloaded but could not launch because native GTK/GStreamer dependencies were absent. Outbound requests from that Chromium runtime returned `net::ERR_EMPTY_RESPONSE` for Tacit’s proving-file host and PublicNode RPCs; live browser connectivity/CORS was therefore not established. Public bytecode, relay quotes and the pinned proof downloads were checked separately over HTTP, and the real proof test used those downloaded files with synthetic chain responses. Physical devices, native browser zoom, screen readers, real mobile app hand-offs, Coinbase account creation and live transactions were not verified. The 200% check enlarges root text; it is not native zoom. Vite emits an optional Node-worker externalization warning from a dependency; the browser proof worker was exercised successfully.

See [the consolidated review](artifacts/validation.md), [design system](DESIGN.md), [mobile screenshot](artifacts/mobile-390.png) and [desktop screenshot](artifacts/desktop-1440.png). These are worker observations, not independent certification.

## Source map

`src/App.tsx` owns navigation, forms, transaction review and session activity. `src/protocol/` adapts the pinned wallet and guards identity/session state. `src/wallet/` owns connectors and mobile hand-offs. `src/components/` contains the shared dialog, recovery UI, brand, privacy illustration and guide. `src/styles.css` contains the final design tokens and responsive rules. `public/` contains assets copied into `dist/`.

The share image is reproducible with `node scripts/make-share.mjs` after installing Chromium, followed by `npm run build`.

## Submission budget and licenses

The explicit path budget for `.gitignore` and delivery groups is documented in [artifacts/BUDGET.md](artifacts/BUDGET.md). Dependencies, caches and scratch checks are excluded at every nesting level; `dist/`, source, lockfile and all local runtime assets remain included. No submodule or npm registry archive is used.

Upstream Tacit code retains its MIT notice in `LICENSE` and `public/protocol/LICENSE.txt`. Bundled cryptographic dependencies have their notices in `public/protocol/THIRD-PARTY-LICENSES.txt`. DM Sans and Instrument Serif retain OFL notices beside their WOFF2 files. Wallet marks are sourced from RainbowKit’s packaged wallet assets and retain the respective brands. Better Interface and Impeccable guidance attribution and licenses are retained in `docs/DESIGN-GUIDANCE-LICENSE.txt`.
