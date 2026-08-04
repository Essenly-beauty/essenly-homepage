import { chromium } from "playwright-core";
const BASE = "http://localhost:4322";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
// Force a classic (space-consuming) scrollbar the way Windows/Linux Chrome has by default.
await p.addInitScript(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = "html::-webkit-scrollbar{width:15px;background:#ccc}html::-webkit-scrollbar-thumb{background:#888}";
    document.head.appendChild(s);
  });
});
await p.goto(`${BASE}/`, { waitUntil: "load" });
await p.waitForTimeout(1000);
console.log("metrics:", JSON.stringify(await p.evaluate(() => ({
  innerWidth: window.innerWidth,
  clientWidth: document.documentElement.clientWidth,
  scrollbar: window.innerWidth - document.documentElement.clientWidth,
}))));
const rest = await p.evaluate(() => {
  const r = document.getElementById("l-hero-bg").getBoundingClientRect();
  const c = document.querySelector(".l-info .container").getBoundingClientRect();
  return { heroLeft: +r.left.toFixed(1), heroRight: +r.right.toFixed(1), heroCentre: +((r.left + r.right) / 2).toFixed(1), contentCentre: +((c.left + c.right) / 2).toFixed(1), clientWidth: document.documentElement.clientWidth };
});
console.log("at rest:", JSON.stringify(rest));
await p.evaluate(() => window.scrollTo(0, 480));
await p.waitForTimeout(1500);
console.log("full expand:", JSON.stringify(await p.evaluate(() => {
  const r = document.getElementById("l-hero-bg").getBoundingClientRect();
  return { w: +r.width.toFixed(1), right: +r.right.toFixed(1), clientWidth: document.documentElement.clientWidth, overhang: +(r.right - document.documentElement.clientWidth).toFixed(1) };
})));
await b.close();
