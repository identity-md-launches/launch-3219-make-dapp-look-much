# Tacit interface

## Overview

Tacit is a self-custody privacy wallet. This implementation concentrates the entry experience on shielding, sending and withdrawing native ETH on Ethereum and Base. Bitcoin and confidential DeFi remain explicit links to the upstream applications.

The interface uses warm paper, dark olive ink, a restrained orange action color and a single shield illustration. The transaction form leads the page. A serif headline provides personality; ordinary controls and financial information use a legible sans serif. Empty balances and session activity are explained rather than populated with sample data.

The source of truth is `src/styles.css`, with component structure in `src/App.tsx` and `src/components/`. This document describes the implemented light interface. There is no alternate dark theme.

## Colors

The canonical notation is hex. Semantic variables refer to the neutral and orange primitives declared in `:root`.

| Semantic token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#f5f4f0` | Workspace background |
| `--color-surface` | `#fcfbf8` | Form and dialog surfaces |
| `--color-hover` | `#eeede7` | Subtle interaction backgrounds, segmented controls |
| `--color-border` | `#deded5` | Structural separators and field borders |
| `--color-text` | `#232820` | Primary text |
| `--color-text-secondary` | `#666a60` | Supporting text |
| `--color-accent` | `#bc4b24` | Primary action background |
| `--color-accent-hover` | `#a13d1b` | Primary hover background |
| `--color-accent-soft` | `#f7e8dd` | Review disclosure and selection |
| `--color-on-accent` | `#ffffff` | Primary button text |
| `--color-focus` | `#bc4b24` | Focus perimeter on light surfaces |
| `--color-focus-inverse` | `#f2f3e9` | Focus perimeter on the dark privacy panel |
| `--color-error` | `#a03228` | Validation and network error text |
| `--color-error-bg` | `#f9eee9` | Network error surface |

The sidebar uses `#efeee8`. The privacy panel deliberately uses a separate dark surface, `#292f27`, with `#f2f3e9` headings, `#c2c8b9` body text and `#c0cbaa` italic text. These colors identify an explanatory surface, not a second application theme. Ethereum, Base and wallet marks retain their own brand colors.

Measured rendered pairs include primary text on the workspace at 13.67:1, supporting text on the workspace at 5.03:1, white on the orange action at 5.04:1, privacy-panel body text at 8.01:1 and validation text on the form at 6.81:1. The dark-panel focus perimeter is 12.27:1 after correction. Measurements and scope are recorded in `artifacts/contrast.json` and `artifacts/validation.md`.

## Typography

`--font-body` is locally bundled **DM Sans**, followed by Arial and sans-serif. The variable WOFF2 provides weights 400–600. The interface uses 400 for ordinary text, 500 for control emphasis and 600 for the brand and form title.

`--font-display` is locally bundled **Instrument Serif**, followed by Georgia and serif. Regular and true italic WOFF2 files both provide weight 400. Display headings and the privacy-panel heading use this family. Font licenses live alongside the files in `public/fonts/`.

| Token | Size at a 16px root | Role |
| --- | --- | --- |
| `--text-xs` | 12px | Metadata, compact utilities, supporting form text |
| `--text-sm` | 14px | Ordinary controls and concise descriptions |
| `--text-base` | 16px | Body text, editable text fields, form heading |
| `--text-lg` | 24px | Brand, dialog and explanatory headings |
| `--text-amount` | 36px | Amount entry and compact display heading |
| `--text-display` | 48px | Desktop page heading |

The page heading uses 1.1 line height and −0.025em tracking; its mobile variant uses 1.08. Amounts use 1.3 and −0.035em, with tabular digits. Body line height is 1.5; longer explanatory copy uses 1.6. Headings balance; descriptions use pretty wrapping. There is no tracked uppercase heading treatment.

Editable text fields are at least 16px at the normal root size. Full addresses wrap or live in a selectable textarea. A short connected address is only a header summary; opening it reveals the complete address and copy control. There is no clipped contract address in the guide.

## Layout

The spacing vocabulary is 4, 8, 12, 16, 20, 24, 32, 40 and 48px, declared as `--space-*` variables. Existing component rules use these values and a few optical adjustments. Preserve shared inset edges when extending them.

Desktop uses a 224px sidebar, an 88px minimum header and a workspace with a 1200px maximum width including padding. Main horizontal padding is 48px. The wallet grid uses `minmax(0, 1.27fr)` and `minmax(0, 1fr)`, with a 24px gap. Form content is inset 28px. The activity section aligns with both panels.

Implemented adaptations:

- At 1240px and below, the sidebar becomes 200px and workspace insets become 32px.
- At 1040px and below, the sidebar becomes 180px and workspace insets become 24px; panels tighten without changing the task order.
- At 860px and below, the sidebar becomes a top navigation row and the logo moves into the header.
- At 640px and below, the form precedes the privacy panel in one column. Page insets are 20px and the main headline becomes 36px. The privacy panel places its illustration beside its copy. Dialogs become bottom sheets.
- At 360px and below, page insets become 16px and the privacy illustration and copy stack.

Header groups, form metadata and fees may wrap. Tab buttons may wrap their content when text is enlarged. This lets content grow vertically instead of clipping names or overflowing. Main actions remain in ordinary document flow; no fixed action bar obscures content. Bottom sheets account for the safe-area inset.

Chromium inspection covered 320, 390, 640, 768, 860, 1024 and 1440px widths. At 390×844, the Shield action ends at y=714. A separate 200% root-text-size check reflows at 390px. This is text enlargement, not a claim of native browser zoom testing.

## Elevation & Depth

The main interface is flat. Surfaces have a structural border or a tonal change; application panels do not combine borders and shadows. The empty activity area uses a dashed boundary. The privacy illustration uses fine rings and static dots; it is decorative and hidden from assistive technology.

Only dialogs have elevation: `0 24px 80px #10180e40`, with a `#18221573` backdrop and 4px backdrop blur. Native modal behavior supplies background inertness. The sidebar uses z-index 5; the skip link uses 100. There are no nested product cards or gradient text.

## Shapes

Shared radii are 6px (`--radius-sm`), 10px (`--radius-md`) and 16px (`--radius-lg`). Desktop panels use 16px, mobile panels 12px, controls 6px, and dialogs 20px. Circular treatments are limited to asset marks, small status illustrations and the flow arrow. Borders are 1px. Focus uses a 2px perimeter offset by 4px, with an inverse color on the dark panel.

## Components

| Component or pattern | Source | Behavior and reuse |
| --- | --- | --- |
| `Brand` | `src/components/Brand.tsx` | Home link, SVG mark and wordmark; `small` variant supports the mobile header |
| Transaction form | `src/App.tsx` | Shield/Send/Withdraw tabs; arrows/Home/End change tabs; labels persist; submit validates and focuses the failing field |
| Buttons | `src/styles.css` | `.primary` for the one consequential action, `.secondary` for neutral actions, `.text-button` for utilities, `.icon-button` for named compact controls |
| `Modal` | `src/components/Modal.tsx` | Named native dialog; contains Tab/Shift+Tab, restores focus, closes with Escape/backdrop/Close; `busy` blocks dismissal during signing/proving |
| `ConnectSheet` | `src/wallet/ConnectSheet.tsx` | Named EIP-6963 rows, Coinbase, mobile wallet links, row pending state and recoverable inline errors; no project ID or relay connection |
| Review | `src/App.tsx` | Exact entered amount and network, public-boundary disclosure, relay fee ceiling per transaction, recovery/risk acknowledgement and transaction progress |
| `Recovery` | `src/components/Recovery.tsx` | Restore a key or explicitly create and save one; no automatic key replacement for contract wallets |
| `PrivacyPanel` | `src/components/PrivacyPanel.tsx` | Single dark explanation surface; local SVG illustration and guide action |
| `Guide` | `src/components/Guide.tsx` | Native disclosures and full contract links; honest limits of privacy, proving, fees and recovery |
| Activity | `src/App.tsx` | Actual session submissions only; filters and an actionable empty state; amounts never persisted as a plain session history |

Primary buttons are at least 48px tall; wallet rows are 52px on phones. Compact utilities use the smaller 24px baseline or sufficient separation, so not every utility has a 44px target. Status changes have text and live-region cues. Busy states disable relevant actions and show a label as well as a spinner.

Hover styling is gated by `hover: hover`. Named background/color transitions are 150ms. Press scaling is 0.96. Motion is enabled only inside `prefers-reduced-motion: no-preference`; there are no entrance animations or perpetual ambient effects.

## Do’s and don’ts

- Start another page inside `.workspace` and `.main-content`; reuse the header, page heading and content edges.
- Use the existing scale and semantic colors. Keep orange for the primary action, not decoration across every section.
- Put instructions beside their controls and retain the distinction between public deposits/withdrawals and private transfers.
- Keep private keys in memory and encrypted notes in the upstream store. Do not add analytics, sample balances, invented activity or unverified “confirmed” labels.
- Extend the existing hash routes; a static host has no rewrite server. Keep assets local and relative, except the explicitly documented RPC, wallet and verified proving-file connections.
- Preserve upstream protocol addresses, proof pins, identity-message bytes and wallet transaction logic. Review protocol changes separately from visual edits.

Design review used Jakub Krehel’s Better Interface (MIT), pinned at `267330e1adfc66a718fb65fa6918c1f06d0a689e`. This documentation method adapts Paul Bakaus’s Impeccable guide (Apache-2.0), pinned at `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`. Notices and license texts are retained in `docs/DESIGN-GUIDANCE-LICENSE.txt`.
