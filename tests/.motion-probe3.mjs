import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:4322";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--disable-features=OverlayScrollbar"],
  });

  // A: overflow caused by the stale rect after resize at scroll 0
  {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(900);
    await p.setViewportSize({ width: 1400, height: 800 });
    await p.waitForTimeout(1400);
    const o = await p.evaluate(() => {
      const r = document.getElementById("l-hero-bg").getBoundingClientRect();
      return {
        heroRight: Math.round(r.right),
        heroBottom: Math.round(r.bottom),
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        canScrollX: window.scrollX,
      };
    });
    console.log("A stale-rect overflow:", JSON.stringify(o));
    await p.evaluate(() => window.scrollTo(3000, 0));
    await p.waitForTimeout(300);
    console.log("A horizontal scroll possible?", await p.evaluate(() => window.scrollX));
    await p.close();
  }

  // B: innerWidth vs clientWidth (scrollbar) at rest and at full expand
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(900);
    console.log(
      "B viewport metrics:",
      JSON.stringify(
        await p.evaluate(() => ({
          innerWidth: window.innerWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollbar: window.innerWidth - document.documentElement.clientWidth,
        }))
      )
    );
    await p.evaluate(() => window.scrollTo(0, 480));
    await p.waitForTimeout(1500);
    console.log(
      "B fully expanded:",
      JSON.stringify(
        await p.evaluate(() => {
          const r = document.getElementById("l-hero-bg").getBoundingClientRect();
          return {
            w: Math.round(r.width),
            clientWidth: document.documentElement.clientWidth,
            docScrollWidth: document.documentElement.scrollWidth,
            overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        })
      )
    );
    await p.close();
  }

  // C: does a mid-flight resize during the expand keep the two triggers in sync?
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(600);
    await p.evaluate(() => window.scrollTo(0, 240)); // halfway through expand
    await p.waitForTimeout(1500);
    const before = await p.evaluate(() => {
      const r = document.getElementById("l-hero-bg").getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(window.scrollY) };
    });
    await p.setViewportSize({ width: 1440, height: 1300 });
    await p.waitForTimeout(1500);
    const after = await p.evaluate(() => {
      const r = document.getElementById("l-hero-bg").getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const rw = 1258 * fs;
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        y: Math.round(window.scrollY),
        expectedAtP: null,
        restW: Math.round(rw),
        vw: window.innerWidth,
      };
    });
    console.log("C mid-expand before:", JSON.stringify(before), "after:", JSON.stringify(after));
    await p.close();
  }

  // D: does the hero ever get stranded visible if the morph is skipped by an instant jump upward?
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(600);
    await p.evaluate(() => window.scrollTo(0, 9000));
    await p.waitForTimeout(1600);
    // instant jump back into the hold phase (between expand end and morph start)
    await p.evaluate(() => window.scrollTo(0, 500));
    await p.waitForTimeout(1600);
    const s = await p.evaluate(() => {
      const el = document.getElementById("l-hero-bg");
      const r = el.getBoundingClientRect();
      return {
        y: Math.round(window.scrollY),
        rect: { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        phase: el.dataset.phase,
        morphed: el.classList.contains("is-morphed"),
        vis: getComputedStyle(el).visibility,
        slotRevealed: document.getElementById("l-slot-a").classList.contains("is-revealed"),
      };
    });
    console.log("D jump 9000 -> 500 (hold phase):", JSON.stringify(s));
    await p.close();
  }

  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
