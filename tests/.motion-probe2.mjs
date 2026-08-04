import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:4322";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const logoInfo = (p) =>
  p.evaluate(() => {
    const el = document.querySelector(".l-header__logo");
    const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return {
      vw: window.innerWidth,
      fs,
      inline: el.getAttribute("style"),
      h: +el.getBoundingClientRect().height.toFixed(1),
      cssLock: +(70 * fs).toFixed(1),
      headerH: +getComputedStyle(document.documentElement).getPropertyValue("--header-h"),
      locked: document.getElementById("l-header").classList.contains("is-locked"),
    };
  });

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  // CASE 7a: fresh load at 1900, scrolled past lock
  {
    const p = await browser.newPage({ viewport: { width: 1900, height: 700 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(500);
    await p.evaluate(() => window.scrollTo(0, 1000));
    await p.waitForTimeout(1500);
    console.log("CASE7a fresh 1900 locked:", JSON.stringify(await logoInfo(p)));
    await p.close();
  }
  // CASE 7b: load at 1440, lock, then resize to 1900
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(500);
    await p.evaluate(() => window.scrollTo(0, 1000));
    await p.waitForTimeout(1500);
    console.log("CASE7b 1440 locked   :", JSON.stringify(await logoInfo(p)));
    await p.setViewportSize({ width: 1900, height: 700 });
    await p.waitForTimeout(1600);
    console.log("CASE7b after resize  :", JSON.stringify(await logoInfo(p)));
    // now scroll back to the very top and check the open size
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(2000);
    console.log("CASE7b back at top   :", JSON.stringify(await logoInfo(p)), "expected open =", 300 * 0.9895833);
    await p.close();
  }

  // CASE 8: accordion changes page height without a ScrollTrigger.refresh
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(600);
    const accTop = await p.evaluate(
      () => document.querySelector(".l-acc__row").getBoundingClientRect().top + window.scrollY
    );
    await p.evaluate((y) => window.scrollTo(0, y - 300), accTop);
    await p.waitForTimeout(1500);
    const before = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.evaluate(() => document.querySelector(".l-acc__row summary").click());
    await p.waitForTimeout(900);
    const after = await p.evaluate(() => document.documentElement.scrollHeight);
    console.log("CASE8 docHeight before/after accordion open:", before, after, "delta", after - before);
    const st = await p.evaluate(() => {
      // report the first rise trigger below the accordion and its recorded start
      const trigs = window.ScrollTrigger ? window.ScrollTrigger.getAll() : null;
      return trigs ? trigs.length : "ScrollTrigger not global";
    });
    console.log("CASE8 ScrollTrigger global?", st);
    // scroll down slowly through the wholesale section and see if risers are visible
    const wholeTop = await p.evaluate(
      () => document.getElementById("wholesale").getBoundingClientRect().top + window.scrollY
    );
    await p.evaluate((y) => window.scrollTo(0, y - 200), wholeTop);
    await p.waitForTimeout(1600);
    const vis = await p.evaluate(() =>
      Array.from(document.querySelectorAll("#wholesale .rise-inner")).map((el) => ({
        top: Math.round(el.getBoundingClientRect().top),
        op: +getComputedStyle(el).opacity,
        txt: (el.textContent || "").trim().slice(0, 18),
      }))
    );
    console.log("CASE8 wholesale risers in view:", JSON.stringify(vis));
    await p.close();
  }

  // CASE 9: anchor offset without the motion layer (reduced motion)
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(600);
    const navHrefs = await p.evaluate(() =>
      Array.from(document.querySelectorAll(".l-nav a")).map((a) => a.getAttribute("href"))
    );
    console.log("CASE9 nav hrefs:", JSON.stringify(navHrefs));
    await p.evaluate(() => document.querySelector('.l-nav a[href="#product"]')?.click());
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const sec = document.getElementById("product");
      const hdr = document.getElementById("l-header");
      return {
        hash: location.hash,
        secTop: Math.round(sec.getBoundingClientRect().top),
        headerBottom: Math.round(hdr.getBoundingClientRect().bottom),
        headerPos: getComputedStyle(hdr).position,
      };
    });
    console.log("CASE9 reduced-motion anchor:", JSON.stringify(r));
    await p.close();
  }

  // CASE 9b: same click with motion on — does the URL hash update?
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/`, { waitUntil: "load" });
    await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelector('.l-nav a[href="#product"]')?.click());
    await p.waitForTimeout(2000);
    const r = await p.evaluate(() => {
      const sec = document.getElementById("product");
      const hdr = document.getElementById("l-header");
      return {
        hash: location.hash,
        secTop: Math.round(sec.getBoundingClientRect().top),
        headerBottom: Math.round(hdr.getBoundingClientRect().bottom),
        scrollY: Math.round(window.scrollY),
      };
    });
    console.log("CASE9b motion anchor:", JSON.stringify(r));
    await p.close();
  }

  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
