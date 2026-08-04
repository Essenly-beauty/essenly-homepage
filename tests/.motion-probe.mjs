import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:4322";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const state = (page) =>
  page.evaluate(() => {
    const el = document.getElementById("l-hero-bg");
    const r = el.getBoundingClientRect();
    const slot = document.getElementById("l-slot-a");
    const sr = slot.getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      vw: window.innerWidth,
      vh: window.innerHeight,
      rootFs: parseFloat(getComputedStyle(document.documentElement).fontSize),
      hero: { left: +r.left.toFixed(1), top: +r.top.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) },
      phase: el.dataset.phase,
      morphed: el.classList.contains("is-morphed"),
      heroVis: getComputedStyle(el).visibility,
      slotRevealed: slot.classList.contains("is-revealed"),
      slotVis: getComputedStyle(slot).visibility,
      slotRect: { left: +sr.left.toFixed(1), top: +sr.top.toFixed(1), w: +sr.width.toFixed(1) },
      motion: document.documentElement.classList.contains("motion"),
      locked: document.getElementById("l-header").classList.contains("is-locked"),
      logoInline: document.querySelector(".l-header__logo").getAttribute("style"),
      logoH: +document.querySelector(".l-header__logo").getBoundingClientRect().height.toFixed(1),
    };
  });

const risers = (page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll(".rise-inner")).map((el, i) => ({
      i,
      op: +getComputedStyle(el).opacity,
      tf: getComputedStyle(el).transform,
      top: Math.round(el.getBoundingClientRect().top),
      txt: (el.textContent || "").trim().slice(0, 20),
    }))
  );

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  if (process.env.ONLY === undefined || process.env.ONLY === "1") {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(900);
    console.log("CASE1 before resize:", JSON.stringify((await state(p)).hero), "fs", (await state(p)).rootFs);
    await p.setViewportSize({ width: 1400, height: 800 });
    await p.waitForTimeout(1200);
    const s = await state(p);
    console.log("CASE1 after  resize:", JSON.stringify(s.hero), "fs", s.rootFs);
    const exp = await p.evaluate(() => {
      const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const w = 1258 * fs, h = 642 * fs;
      return { left: +((window.innerWidth - w) / 2).toFixed(1), top: +(window.innerHeight - h).toFixed(1), width: +w.toFixed(1), height: +h.toFixed(1) };
    });
    console.log("CASE1 expected rest:", JSON.stringify(exp));
    await p.mouse.wheel(0, 30);
    await p.waitForTimeout(1400);
    console.log("CASE1 after 30px wheel:", JSON.stringify((await state(p)).hero), "scrollY", (await state(p)).scrollY);
    await p.close();
  }

  if (process.env.ONLY === undefined || process.env.ONLY === "2") {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = [];
    p.on("pageerror", (e) => errs.push(String(e)));
    await p.goto(`${BASE}/#contact`, { waitUntil: "load" });
    await p.waitForTimeout(1800);
    console.log("CASE2 deep link #contact:", JSON.stringify(await state(p)));
    const rs = await risers(p);
    console.log("CASE2 risers with opacity<0.99:", JSON.stringify(rs.filter((r) => r.op < 0.99)));
    console.log("CASE2 riser count:", rs.length, "errors:", errs);
    await p.close();
  }

  if (process.env.ONLY === undefined || process.env.ONLY === "3") {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(600);
    await p.evaluate(() => window.scrollTo(0, 6000));
    await p.waitForTimeout(1600);
    console.log("CASE3 pre-reload:", JSON.stringify(await state(p)));
    await p.reload({ waitUntil: "load" });
    await p.waitForTimeout(1800);
    console.log("CASE3 post-reload:", JSON.stringify(await state(p)));
    console.log("CASE3 post-reload risers hidden:", JSON.stringify((await risers(p)).filter((r) => r.op < 0.99)));
    await p.close();
  }

  if (process.env.ONLY === undefined || process.env.ONLY === "4") {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(600);
    const infoTop = await p.evaluate(() => document.getElementById("l-info").getBoundingClientRect().top + window.scrollY);
    const mid = Math.round(infoTop - 900 / 2);
    await p.evaluate((y) => window.scrollTo(0, y), mid);
    await p.waitForTimeout(1600);
    console.log("CASE4 mid-morph:", JSON.stringify(await state(p)));
    await p.setViewportSize({ width: 1440, height: 1200 });
    await p.waitForTimeout(1600);
    console.log("CASE4 taller:", JSON.stringify(await state(p)));
    await p.setViewportSize({ width: 1900, height: 700 });
    await p.waitForTimeout(1600);
    console.log("CASE4 wide/short:", JSON.stringify(await state(p)));
    await p.close();
  }

  if (process.env.ONLY === undefined || process.env.ONLY === "5") {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(600);
    await p.evaluate(() => window.scrollTo(0, 6000));
    await p.waitForTimeout(1600);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(2000);
    console.log("CASE5 back at top:", JSON.stringify(await state(p)));
    console.log("CASE5 risers hidden at top:", JSON.stringify((await risers(p)).filter((r) => r.op < 0.99).map((r) => r.i)));
    await p.setViewportSize({ width: 900, height: 900 });
    await p.waitForTimeout(1600);
    console.log("CASE5 after teardown:", JSON.stringify(await state(p)));
    const hid = (await risers(p)).filter((r) => r.op < 0.99);
    console.log("CASE5 risers still hidden after teardown:", JSON.stringify(hid.slice(0, 8)), "count", hid.length);
    console.log("CASE5 root classes:", await p.evaluate(() => document.documentElement.className));
    await p.close();
  }

  if (process.env.ONLY === undefined || process.env.ONLY === "6") {
    for (const vp of [{ width: 1920, height: 560 }, { width: 2600, height: 800 }, { width: 1280, height: 620 }]) {
      const p = await browser.newPage({ viewport: vp });
      await p.goto(`${BASE}/`, { waitUntil: "load" });
      await p.waitForTimeout(1000);
      const s = await state(p);
      console.log(`CASE6 ${vp.width}x${vp.height} fs=${s.rootFs} rest=`, JSON.stringify(s.hero), "logoH", s.logoH);
      await p.close();
    }
  }

  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
