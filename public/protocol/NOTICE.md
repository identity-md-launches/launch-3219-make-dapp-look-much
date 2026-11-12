Tacit standalone EVM pool wallet

Source: https://github.com/z0r0z/tacit
Commit: c61a8e5f9d27a738bacc34765286a745d86d0f19
Path: dapp/evm-pool/tacit-evm-pool-wallet.js
SHA-256: 0e8431ebfbb5651d59340fe3b6ad9889d305d7e501aa81b21607042cb7d3df43

The module is preserved byte for byte. Copyright (c) 2026 ross, MIT (see LICENSE.txt). It bundles snarkjs and other third-party code; their licenses are retained in THIRD-PARTY-LICENSES.txt. The pinned circuit files are fetched only when proving. The circuit and proving key are not bundled in this static export. Their verified sizes (4,916,992 + 28,558,285 bytes) exceed the assignment’s entire 8 MiB delivery budget. The local loader fetches them from Tacit or its pinned upstream source; the original wallet refuses bytes that do not match the ceremony pins.
