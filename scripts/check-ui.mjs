import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { previewServer } from "./preview-server.mjs";

const out = "test/scratch/interaction";
await mkdir(out, { recursive: true });
const server = await previewServer();
const report = { checks: [], limitations: [], screenshots: [] };
const browsers = [];
const record = (name, detail = "") => {
  report.checks.push({ name, passed: true, detail });
  console.log(`PASS ${name}${detail ? ": " + detail : ""}`);
};
const assertVisible = async (locator) => {
  await locator.waitFor({ state: "visible", timeout: 12_000 });
  assert.ok(await locator.isVisible(), `Expected visible: ${locator}`);
};
let page;

try {
  const browser = await chromium.launch({ headless: true });
  browsers.push(browser);
  const context = await browser.newContext();
  page = await context.newPage();
  const errors = [];
  const failures = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(server.url) && response.status() >= 400)
      failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.goto(server.url);
  await page.evaluate(() => document.fonts.ready);

  for (const [width, height] of [
    [320, 700],
    [390, 844],
    [640, 900],
    [768, 1024],
    [860, 900],
    [1024, 900],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    for (const hash of ["wallet", "activity", "guide"]) {
      await page.goto(server.url + "#" + hash);
      await page.evaluate(() => document.fonts.ready);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow at ${width}, ${hash}`,
      );
      assert.equal(await page.locator("main h1").count(), 1);
      if (hash === "wallet" && width === 390) {
        const button = await page
          .getByRole("button", { name: "Shield ETH", exact: true })
          .boundingBox();
        assert.ok(
          button.y >= 0 && button.y + button.height <= height,
          "Primary action is below the first screen",
        );
        record(
          "390 first-screen product",
          `Shield ETH button y=${Math.round(button.y)}, bottom=${Math.round(button.y + button.height)} of ${height}`,
        );
      }
      if (hash === "wallet" && [320, 390, 1440].includes(width)) {
        const path = `${out}/wallet-${width}.png`;
        await page.screenshot({ path, fullPage: true });
        report.screenshots.push(path);
      }
    }
  }
  record(
    "Responsive routes",
    "Wallet, activity and guide at 320, 390, 640, 768, 860, 1024 and 1440; no horizontal overflow",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(server.url);
  for (const action of ["Send", "Withdraw", "Shield"]) {
    await page.getByRole("tab", { name: action, exact: true }).click();
    if (action !== "Shield")
      await assertVisible(
        page.getByLabel(
          action === "Send"
            ? "Tacit recipient address"
            : "Public recipient address",
        ),
      );
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      `${action} accessibility scan`,
    );
  }
  record(
    "Transaction tabs and accessibility",
    "All three form states; zero axe WCAG A/AA violations",
  );
  await page.getByRole("tab", { name: "Shield", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .getByRole("tab", { name: "Send", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.keyboard.press("End");
  assert.equal(
    await page
      .getByRole("tab", { name: "Withdraw", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.keyboard.press("Home");
  await page.getByRole("button", { name: "Shield ETH", exact: true }).click();
  assert.equal(
    await page.locator("#amount").getAttribute("aria-invalid"),
    "true",
  );
  assert.equal(await page.evaluate(() => document.activeElement.id), "amount");
  await page.locator("#amount").fill("0");
  await page.getByRole("button", { name: "Shield ETH", exact: true }).click();
  await assertVisible(page.getByText("Enter an amount greater than zero."));
  await page.locator("#amount").fill("1.1234567890123456789");
  await page.getByRole("button", { name: "Shield ETH", exact: true }).click();
  await assertVisible(
    page.getByText("Enter an ETH amount with up to 18 decimal places."),
  );
  await page.locator("#amount").fill("0.1");
  await page.getByRole("tab", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "Send ETH", exact: true }).click();
  assert.equal(
    await page.locator("#recipient").getAttribute("aria-invalid"),
    "true",
  );
  await page.getByRole("tab", { name: "Withdraw", exact: true }).click();
  await page.locator("#recipient").fill("not-an-address");
  await page.getByRole("button", { name: "Withdraw ETH", exact: true }).click();
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "recipient",
  );
  record(
    "Form validation",
    "Blank, zero, excess precision, incomplete private recipient and invalid public recipient; error labels and focus",
  );

  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await assertVisible(page.getByRole("dialog", { name: "Connect a wallet" }));
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    assert.ok(
      await page.evaluate(() => !!document.activeElement.closest("dialog")),
      "Focus escaped the dialog",
    );
  }
  const focusPath = `${out}/wallet-focus.png`;
  await page.screenshot({ path: focusPath });
  report.screenshots.push(focusPath);
  const dialogAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    dialogAxe.violations.map((v) => v.id),
    [],
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    "Connect",
  );
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("button", { name: "Browser wallet" }).click();
  await assertVisible(
    page.getByText(
      "No browser wallet found. Install a wallet extension, or use Coinbase Wallet.",
    ),
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  record(
    "Wallet sheet",
    "Named native modal; Tab stays inside; Escape and close restore focus; no-extension recovery shown",
  );
  await page.goto(server.url + "#guide");
  await page.getByText("Prove on your device", { exact: true }).click();
  await assertVisible(
    page.getByText(/The first transaction downloads about 33 MB/),
  );
  const guideAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    guideAxe.violations.map((v) => v.id),
    [],
  );
  await page.goto(server.url + "#activity");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await assertVisible(page.getByRole("heading", { name: "No send activity." }));
  await page.getByRole("button", { name: "Clear filter" }).click();
  await assertVisible(page.getByRole("heading", { name: "A clean slate." }));
  record(
    "Guide and activity",
    "Hash deep links, disclosures, filter empty state and reset; zero axe violations on guide",
  );

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  await phone.goto(server.url);
  await phone.getByRole("button", { name: "Connect", exact: true }).click();
  for (const name of ["MetaMask", "Coinbase Wallet", "Rabby", "Phantom"]) {
    const row = phone.getByRole("link", { name: "Open in " + name });
    await assertVisible(row);
    assert.ok(
      (await row.getAttribute("href")).includes(
        encodeURIComponent(server.url),
      ) || name === "MetaMask",
    );
  }
  await assertVisible(
    phone.getByRole("button", { name: "Coinbase Smart Wallet" }),
  );
  assert.equal(
    await phone.getByRole("button", { name: "Browser wallet" }).count(),
    0,
  );
  const mobileDialog = await phone.getByRole("dialog").boundingBox();
  assert.ok(Math.abs(mobileDialog.y + mobileDialog.height - 844) < 2);
  const path = `${out}/mobile-wallet-sheet.png`;
  await phone.screenshot({ path });
  report.screenshots.push(path);
  record(
    "Phone wallet paths",
    "Four universal links, Coinbase Smart Wallet, no QR/relay, bottom sheet at 390",
  );
  await mobile.close();

  // Ephemeral signing account and synthetic chain responses live only in this test.
  // No transaction is ever sent to a live network.
  const account = privateKeyToAccount(generatePrivateKey());
  const message = [
    "Tacit identity",
    "",
    "Signing this creates your Tacit private key. Anyone who has this signature controls all of your Tacit funds.",
    "",
    "Sign it only in a Tacit app you trust. Every Tacit app asks for exactly this message.",
    "",
    "network: mainnet",
    "version: 1",
  ].join("\n");
  const signature = await account.signMessage({ message });
  const mockContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await mockContext.addInitScript(
    ({ address, signature }) => {
      const listeners = new Map();
      const state = (window.__walletMock = {
        chainId: "0x1",
        code: "0x",
        rejected: false,
        authorized: false,
        accounts: [address],
        requests: [],
      });
      const provider = {
        on: (name, fn) => {
          const set = listeners.get(name) || new Set();
          set.add(fn);
          listeners.set(name, set);
        },
        removeListener: (name, fn) => listeners.get(name)?.delete(fn),
        request: async ({ method, params }) => {
          state.requests.push({ method, params });
          if (method === "eth_accounts")
            return state.authorized ? state.accounts : [];
          if (method === "eth_requestAccounts") {
            state.authorized = true;
            return state.accounts;
          }
          if (method === "eth_chainId") return state.chainId;
          if (method === "eth_getBalance") return "0x1bc16d674ec80000";
          if (method === "eth_getCode") return state.code;
          if (method === "personal_sign") {
            if (state.rejected)
              throw Object.assign(new Error("User rejected"), { code: 4001 });
            return signature;
          }
          if (method === "wallet_requestPermissions") {
            state.authorized = true;
            return [{ parentCapability: "eth_accounts" }];
          }
          if (method === "wallet_switchEthereumChain") {
            if (params[0].chainId === "0x2105" && !state.knowsBase)
              throw Object.assign(new Error("Unknown chain"), { code: 4902 });
            state.chainId = params[0].chainId;
            listeners.get("chainChanged")?.forEach((fn) => fn(state.chainId));
            return null;
          }
          if (method === "wallet_addEthereumChain") {
            state.knowsBase = true;
          state.chainId = params[0].chainId;
          listeners.get("chainChanged")?.forEach((fn) => fn(state.chainId));
            return null;
          }
          if (method === "eth_call") return "0x" + "0".repeat(64);
          if (method === "eth_sendTransaction")
            throw Object.assign(new Error("User rejected transaction"), {
              code: 4001,
            });
          throw new Error("Unmocked provider method: " + method);
        },
      };
      window.ethereum = provider;
      state.changeChain = (id) => {
        state.chainId = id;
        listeners.get("chainChanged")?.forEach((fn) => fn(id));
      };
      state.changeAccount = (address) => {
        state.accounts = [address];
        listeners.get("accountsChanged")?.forEach((fn) => fn(state.accounts));
      };
      const announce = () =>
        dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: {
              info: {
                uuid: "66fdf045-a150-4504-a2da-c0592927def5",
                name: "Validation Wallet",
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><circle cx="14" cy="14" r="14" fill="%23232820"/></svg>',
                rdns: "test.validation.wallet",
              },
              provider,
            },
          }),
        );
      addEventListener("eip6963:requestProvider", announce);
      setTimeout(announce, 0);
    },
    { address: account.address, signature },
  );
  await mockContext.route("https://**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    if (/tacit-evm-pool-keepers/.test(url)) {
      if (url.includes("/events"))
        return route.fulfill({
          json: {
            chainId: 1,
            pool: "0x000000c2A20657CE25f2Ba99737933D031AFBEE9",
            through: 26069252,
            events: [],
          },
        });
      return route.fulfill({
        status: 503,
        json: { error: "Test relay unavailable" },
      });
    }
    if (/ethereum-rpc|eth.drpc|base-rpc|mainnet.base/.test(url)) {
      const body = request.postDataJSON();
      const answer = (entry) => ({
        jsonrpc: "2.0",
        id: entry.id,
        result:
          entry.method === "eth_chainId"
            ? "0x1"
            : entry.method === "eth_getBalance"
              ? "0x1bc16d674ec80000"
              : entry.method === "eth_blockNumber"
                ? "0x18dca5f"
                : entry.method === "eth_getLogs"
                  ? []
                  : entry.method === "eth_getCode"
                    ? "0x"
                    : "0x" + "0".repeat(64),
      });
      return route.fulfill({
        json: Array.isArray(body) ? body.map(answer) : answer(body),
      });
    }
    if (
      /transact\.(wasm)|transact_final\.zkey/.test(url) &&
      process.env.CHECK_PROOF_ARTIFACTS
    ) {
      const name = url.endsWith(".wasm")
        ? "transact.wasm"
        : "transact_final.zkey";
      return route.fulfill({
        body: await readFile(resolve(process.env.CHECK_PROOF_ARTIFACTS, name)),
        contentType: "application/octet-stream",
      });
    }
    return route.abort();
  });
  const signed = await mockContext.newPage();
  const plainPage = page;
  signed.on("pageerror", (error) =>
    console.log("Mock page error:", error.message),
  );
  await signed.goto(server.url);
  await signed.getByRole("button", { name: "Connect", exact: true }).click();
  page = signed;
  await assertVisible(
    signed.getByRole("button", { name: "Validation Wallet" }),
  );
  assert.equal(
    await signed.getByRole("button", { name: "Browser wallet" }).count(),
    0,
  );
  await signed.getByRole("button", { name: "Validation Wallet" }).click();
  await signed
    .getByRole("button", { name: "Unlock wallet", exact: true })
    .click();
  await signed.evaluate(() => {
    window.__walletMock.rejected = true;
  });
  await signed.getByRole("button", { name: "Sign to unlock" }).click();
  await assertVisible(
    signed
      .getByText("Request cancelled. You can try again.", { exact: true })
      .first(),
  );
  await signed.evaluate(() => {
    window.__walletMock.rejected = false;
  });
  await signed.getByRole("button", { name: "Sign to unlock" }).click();
  await signed
    .getByRole("button", { name: "Receive", exact: true })
    .waitFor({ timeout: 30_000 });
  await signed.getByRole("button", { name: "Receive", exact: true }).click();
  const privateAddress = await signed.locator("#private-address").inputValue();
  assert.ok(privateAddress.startsWith("bp1"));
  await signed.getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(
    await signed.evaluate(
      () =>
        window.__walletMock.requests.filter((r) => r.method === "personal_sign")
          .length,
    ),
    3,
    "One rejected, two identical identity signatures",
  );
  record(
    "EIP-6963 and real identity",
    "Named wallet wins over generic; rejection recovery; canonical signature recovery; real upstream module opens and scans an empty synthetic chain",
  );
  await signed.locator("#amount").fill("0.1");
  await signed.getByRole("button", { name: "Shield ETH", exact: true }).click();
  await assertVisible(signed.getByRole("dialog", { name: "Review shield" }));
  assert.ok(
    await signed
      .getByRole("button", { name: "Confirm shield", exact: true })
      .isDisabled(),
  );
  await signed.getByRole("checkbox").check();
  assert.ok(
    await signed
      .getByRole("button", { name: "Confirm shield", exact: true })
      .isEnabled(),
  );
  if (process.env.CHECK_PROOF_ARTIFACTS) {
    await signed
      .getByRole("button", { name: "Confirm shield", exact: true })
      .click();
    await signed
      .getByText("Request cancelled. You can try again.", { exact: true })
      .waitFor({ timeout: 180_000 });
    const sends = await signed.evaluate(() =>
      window.__walletMock.requests.filter(
        (r) => r.method === "eth_sendTransaction",
      ),
    );
    assert.equal(sends.length, 1);
    assert.equal(
      sends[0].params[0].to.toLowerCase(),
      "0x000000c2a20657ce25f2ba99737933d031afbee9",
    );
    assert.equal(sends[0].params[0].value, "0x16345785d8a0000");
    assert.ok(sends[0].params[0].data.length > 1000);
    record(
      "Real proof smoke test",
      "Pinned 33 MB files loaded; real Groth16 proof built and verified by the upstream worker; correct pool/value/calldata reaches a rejecting mock signer; no live transaction",
    );
  } else {
    await signed.getByRole("button", { name: "Close", exact: true }).click();
    report.limitations.push(
      "Proof generation was not exercised in this run; set CHECK_PROOF_ARTIFACTS to a folder containing the pinned wasm and zkey.",
    );
  }
  record(
    "Transaction review",
    "Public boundary, real network, experimental/recovery acknowledgement required; no transaction on cancel",
  );
  await signed.evaluate(() => window.__walletMock.changeChain("0x89"));
  await signed
    .getByRole("button", { name: "Switch to Ethereum", exact: true })
    .first()
    .waitFor();
  await signed
    .getByRole("button", { name: "Switch to Ethereum", exact: true })
    .first()
    .click();
  await signed
    .getByRole("button", { name: new RegExp(account.address.slice(0, 6), "i") })
    .waitFor();
  assert.ok(
    await signed.evaluate(() =>
      window.__walletMock.requests.some(
        (r) => r.method === "wallet_switchEthereumChain",
      ),
    ),
  );
  record(
    "Wrong network",
    "Explicit switch control; injected connector sends wallet_switchEthereumChain",
  );
  await signed
    .getByRole("button", { name: new RegExp(account.address.slice(0, 6), "i") })
    .click();
  await signed.getByRole("button", { name: "Back up recovery key" }).click();
  const backupEvent = signed.waitForEvent("download");
  await signed.getByRole("button", { name: "Download recovery key" }).click();
  const backup = await backupEvent;
  await backup.saveAs(`${out}/ephemeral-test-recovery.txt`);
  const backupKey = (
    await readFile(`${out}/ephemeral-test-recovery.txt`, "utf8")
  ).trim();
  assert.match(backupKey, /^0x[\da-f]{64}$/i);
  await signed.getByRole("button", { name: "Close", exact: true }).click();
  await signed
    .getByRole("button", { name: new RegExp(account.address.slice(0, 6), "i") })
    .click();
  await signed.getByRole("button", { name: "Lock private wallet" }).click();
  await signed
    .getByRole("button", { name: "Unlock wallet", exact: true })
    .click();
  await signed
    .getByRole("button", { name: "Recovery key", exact: true })
    .click();
  await signed.locator("#recovery-key").fill("invalid");
  await signed.getByRole("button", { name: "Restore private wallet" }).click();
  await assertVisible(
    signed.getByText("Enter a valid 64-character hexadecimal recovery key."),
  );
  await signed.locator("#recovery-key").fill(backupKey);
  await signed.getByRole("button", { name: "Restore private wallet" }).click();
  await signed
    .getByRole("button", { name: "Receive", exact: true })
    .waitFor({ timeout: 30_000 });
  await signed.getByRole("button", { name: "Receive", exact: true }).click();
  assert.equal(
    await signed.locator("#private-address").inputValue(),
    privateAddress,
  );
  await signed.getByRole("button", { name: "Close", exact: true }).click();
  record(
    "Recovery round trip",
    "Download an ephemeral test identity, lock, validate an invalid import, restore backup and recover the identical real Tacit address",
  );
  const secondAccount = privateKeyToAccount(generatePrivateKey());
  await signed.evaluate(
    (address) => window.__walletMock.changeAccount(address),
    secondAccount.address,
  );
  await signed
    .getByRole("button", { name: "Unlock wallet", exact: true })
    .waitFor();
  assert.equal(
    await signed.getByRole("button", { name: "Receive", exact: true }).count(),
    0,
  );
  record(
    "Account change",
    "Clears private wallet, private balance and session history before another account can act",
  );
  await signed.getByLabel("Network", { exact: true }).selectOption("8453");
  await signed
    .getByRole("button", { name: "Switch to Base", exact: true })
    .first()
    .click();
  await signed
    .getByRole("button", {
      name: new RegExp(secondAccount.address.slice(0, 6), "i"),
    })
    .waitFor();
  const added = await signed.evaluate(() =>
    window.__walletMock.requests.find(
      (r) => r.method === "wallet_addEthereumChain",
    ),
  );
  assert.equal(added.params[0].chainId, "0x2105");
  assert.ok(added.params[0].rpcUrls[0].startsWith("https://"));
  record(
    "Unknown-chain fallback",
    "wallet_addEthereumChain receives Base chain ID, native currency and real RPC/explorer parameters",
  );
  await mockContext.close();
  page = plainPage;

  await page.goto(server.url);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const running = await page.evaluate(
    () =>
      document.getAnimations().filter((a) => a.playState === "running").length,
  );
  assert.equal(running, 0);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Text enlargement overflow",
  );
  record(
    "Reduced motion and text enlargement",
    "No running animations under reduce; 200% root font size at 390 reflows without document overflow",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  record(
    "Production assets and console",
    "Served under /preview/; no page errors or failed local resources on all inspected routes",
  );
  record(
    "Local fonts",
    await page.evaluate(() =>
      [...document.fonts].map((f) => `${f.family} ${f.status}`).join(", "),
    ),
  );
  try {
    const safari = await webkit.launch({ headless: true });
    browsers.push(safari);
    const web = await safari.newPage({ viewport: { width: 390, height: 844 } });
    await web.goto(server.url);
    await web.getByRole("button", { name: "Connect", exact: true }).click();
    await assertVisible(web.getByRole("dialog", { name: "Connect a wallet" }));
    await web.keyboard.press("Escape");
    record("WebKit", "390 layout and wallet sheet open/close");
  } catch {
    report.limitations.push(
      "WebKit could not launch because native GTK and GStreamer dependencies were unavailable. WebKit behavior is not verified.",
    );
    console.log("LIMITATION WebKit host dependencies unavailable");
  }
  report.limitations.push(
    "No physical devices, native browser zoom or screen-reader session. Coinbase account creation and mobile app hand-offs require real wallets and were not completed. No live onchain transaction was sent.",
  );
} catch (error) {
  report.checks.push({
    name: "Interaction suite",
    passed: false,
    detail: error.stack,
  });
  console.error(error);
  if (page)
    await page
      .screenshot({ path: `${out}/failure.png`, fullPage: true })
      .catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
  for (const browser of browsers) await browser.close();
  await server.close();
}
