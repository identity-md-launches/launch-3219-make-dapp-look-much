import { chromium } from "playwright";
import { previewServer } from "./preview-server.mjs";

const server = await previewServer("public");
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.route(server.url + "__share", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body></body></html>",
    }),
  );
  await page.goto(server.url + "__share");
  await page.setContent(`<style>
  @font-face{font-family:DM;src:url('${server.url}fonts/dm-sans-latin.woff2')}@font-face{font-family:Instrument;src:url('${server.url}fonts/instrument-serif-400-latin.woff2')}@font-face{font-family:Instrument;src:url('${server.url}fonts/instrument-serif-400i-latin.woff2');font-style:italic}
  *{box-sizing:border-box}body{margin:0;background:#f5f4f0;color:#232820;font-family:DM,Arial,sans-serif}.wrap{height:630px;display:flex;padding:56px 64px;position:relative}.left{width:690px;display:flex;flex-direction:column}.logo{font-size:36px;font-weight:600;display:flex;align-items:center;gap:10px}.logo img{height:42px;width:42px}.logo i{color:#bc4b24;font-style:normal}h1{font-family:Instrument,Georgia,serif;font-weight:400;font-size:90px;letter-spacing:-2px;line-height:1.05;margin:62px 0 22px}h1 em{color:#4d5348}p{font-size:23px;color:#666a60;margin:0}.bottom{margin-top:auto;display:flex;align-items:center;gap:12px;font-size:16px}.dot{height:8px;width:8px;border-radius:50%;background:#bc4b24}.right{position:absolute;right:48px;top:48px;width:350px;height:534px;border-radius:24px;background:#292f27;display:flex;align-items:center;justify-content:center;overflow:hidden}.right svg{width:390px;max-width:none;flex-shrink:0}.note{position:absolute;bottom:40px;color:#c2c8b9;font-size:15px}
  </style><div class="wrap"><div class="left"><div class="logo"><img src="${server.url}favicon.svg"/>tacit<i>.</i></div><h1>Your money.<br/><em>Your business.</em></h1><p>A self-custody wallet for private ETH.</p><div class="bottom"><span class="dot"></span>Shield &nbsp; / &nbsp; Send &nbsp; / &nbsp; Withdraw</div></div><div class="right"><svg viewBox="0 0 360 360" fill="none"><circle cx="180" cy="180" r="143" stroke="#4c5549"/><circle cx="180" cy="180" r="111" stroke="#4c5549"/><ellipse cx="180" cy="180" rx="165" ry="74" stroke="#6c795e" stroke-dasharray="3 6" transform="rotate(-35 180 180)"/><ellipse cx="180" cy="180" rx="165" ry="74" stroke="#6c795e" stroke-dasharray="3 6" transform="rotate(35 180 180)"/><path d="M180 95l64 27v57c0 46-39 75-64 86-25-11-64-40-64-86v-57l64-27Z" fill="#30382d" stroke="#a0b191" stroke-width="1.5"/><path d="M160 177v-16a20 20 0 0 1 40 0v16" stroke="#d4ddc6" stroke-width="2.5"/><rect x="152" y="177" width="56" height="43" rx="6" stroke="#d4ddc6" stroke-width="2.5"/><path d="M180 194v9" stroke="#d4ddc6" stroke-width="4" stroke-linecap="round"/><circle cx="53" cy="115" r="7" fill="#dc7b48"/><circle cx="307" cy="243" r="7" fill="#d4ddc6"/></svg><div class="note">More ownership. Less exposure.</div></div></div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/share.png" });
  console.log("Created public/share.png (1200 × 630).");
} finally {
  await browser?.close();
  await server.close();
}
