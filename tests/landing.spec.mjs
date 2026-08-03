/*
  Verification harness for the landing page.

  Drives the locally installed Chrome through playwright-core rather than a
  headless download: the scroll choreography is the thing under test, and it only
  exists above 1280px, so the test has to control the viewport and step the scroll
  position deliberately.

  Usage:  node tests/landing.spec.mjs [baseUrl] [--shots <dir>]
  Exits non-zero on the first failed assertion, so it is usable as a gate.
*/
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:4321";
const shotsFlag = process.argv.indexOf("--shots");
const SHOTS = shotsFlag > -1 ? process.argv[shotsFlag + 1] : null;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const results = [];
let failed = 0;

function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  if (!pass) failed++;
  console.log(`${pass ? "  ok  " : " FAIL "} ${name}${detail ? `  — ${detail}` : ""}`);
}

function near(actual, expected, tol, name) {
  const pass = Math.abs(actual - expected) <= tol;
  /* Rounding to whole pixels would report the 0.75px root font-size as "1". */
  const shown = Math.abs(actual) < 10 ? actual.toFixed(2) : Math.round(actual);
  check(name, pass, `got ${shown}, expected ~${expected} (±${tol})`);
}

const heroRect = (page) =>
  page.evaluate(() => {
    const el = document.getElementById("l-hero-bg");
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });

async function scrollTo(page, y) {
  /* Lenis animates toward the target, so the raw scrollTo has to be followed by
     enough frames for it to settle before anything is measured. */
  await page.evaluate((target) => window.scrollTo(0, target), y);
  await page.waitForTimeout(1200);
}

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  if (SHOTS) await mkdir(SHOTS, { recursive: true });

  /* ---------------- desktop ---------------- */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`${BASE}/preview`, { waitUntil: "load" });
  await page.waitForTimeout(1500);

  check("motion layer engaged at 1440px", await page.evaluate(() => document.documentElement.classList.contains("motion")));

  const rootFs = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  near(rootFs, 0.75, 0.01, "root font-size is viewport-derived (0.75px at 1440)");

  const h1 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".h-display")).fontSize));
  near(h1, 82.5, 1, "display headline matches the reference (110rem = 82.5px)");

  // Hero at rest: the reference's card is 943x481 sitting on the viewport floor.
  const rest = await heroRect(page);
  near(rest.width, 943, 4, "hero at rest — width");
  near(rest.height, 481, 4, "hero at rest — height");
  near(rest.top, 418, 6, "hero at rest — sits on the viewport floor");
  near(rest.left, 248, 6, "hero at rest — centred");

  // Expand: 480px of scroll takes it to fullscreen.
  await scrollTo(page, 480);
  const full = await heroRect(page);
  near(full.width, 1440, 12, "after expand — fills viewport width");
  near(full.height, 900, 12, "after expand — fills viewport height");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/02-hero-fullscreen.png` });

  // Hold: nothing moves between the end of the expand and the start of the morph.
  await scrollTo(page, 800);
  const held = await heroRect(page);
  check(
    "hold phase — hero stays fullscreen",
    Math.abs(held.width - full.width) < 6 && Math.abs(held.height - full.height) < 6,
    `${Math.round(held.width)}x${Math.round(held.height)}`
  );

  // Morph: the hero shrinks toward the inline slot and hands over to the real img.
  await scrollTo(page, 1500);
  const mid = await heroRect(page);
  check("morph in progress — hero has left fullscreen", mid.width < full.width - 100, `${Math.round(mid.width)}px wide`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/03-hero-morphing.png` });

  await scrollTo(page, 2100);
  const landed = await page.evaluate(() => ({
    morphed: document.getElementById("l-hero-bg").classList.contains("is-morphed"),
    revealed: document.getElementById("l-slot-a").classList.contains("is-revealed"),
  }));
  check("morph complete — hero hidden", landed.morphed);
  check("morph complete — inline slot revealed", landed.revealed);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/04-headline.png` });

  // Reverse: scrolling back up has to restore fullscreen, not snap to the rest card.
  await scrollTo(page, 700);
  const reversed = await heroRect(page);
  const reversedState = await page.evaluate(() => ({
    morphed: document.getElementById("l-hero-bg").classList.contains("is-morphed"),
    revealed: document.getElementById("l-slot-a").classList.contains("is-revealed"),
  }));
  check("reverse — hero un-hidden", !reversedState.morphed);
  check("reverse — inline slot re-hidden", !reversedState.revealed);
  near(reversed.width, 1440, 20, "reverse — hero back to fullscreen");

  // Wordmark shrink locks after its range.
  await scrollTo(page, 400);
  check("wordmark locked after shrink range", await page.evaluate(() => document.getElementById("l-header").classList.contains("is-locked")));
  await scrollTo(page, 0);
  await page.waitForTimeout(600);
  check("wordmark unlocks back at the top", await page.evaluate(() => !document.getElementById("l-header").classList.contains("is-locked")));

  // Philosophy lines light up.
  await scrollTo(page, 3000);
  const lit = await page.evaluate(() => document.querySelectorAll(".l-philosophy__line.is-lit").length);
  check("philosophy lines light on arrival", lit > 0, `${lit} of 4 lit`);

  /* Rise reveals actually reveal rather than leaving content invisible. Measured
     against the trigger threshold, not the viewport edge: an element only just
     poking in from the bottom is correctly still hidden, and asserting on the raw
     edge would flag that as a failure. */
  const hidden = await page.evaluate(() => {
    const THRESHOLD = 120; // comfortably past the trigger's own bottom-=60
    return Array.from(document.querySelectorAll(".rise-inner"))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const past = r.top < window.innerHeight - THRESHOLD && r.bottom > 0;
        return past && parseFloat(getComputedStyle(el).opacity) < 0.5;
      })
      .map((el) => (el.textContent || "").trim().slice(0, 40));
  });
  check("no revealed-range content left hidden by a rise", hidden.length === 0, hidden.join(" | "));

  // Accordion.
  await page.click("#acc-mechanism > summary");
  await page.waitForTimeout(700);
  check("accordion opens", await page.evaluate(() => document.querySelectorAll(".l-acc__row[open]").length) === 1);
  await page.click("#acc-ingredients > summary");
  await page.waitForTimeout(900);
  const openCount = await page.evaluate(() => document.querySelectorAll(".l-acc__row[open]").length);
  check("accordion keeps one panel open at a time", openCount === 1, `${openCount} open`);

  // Form tabs drive the hidden fields the submission relies on.
  await page.click('[data-tab="Wholesale"]');
  await page.waitForTimeout(300);
  const tabState = await page.evaluate(() => ({
    type: document.getElementById("l-form-type")?.value,
    subject: document.getElementById("l-form-subject")?.value,
    companyRequired: document.getElementById("l-company")?.required,
    label: document.getElementById("l-company-label")?.textContent?.trim(),
  }));
  check("wholesale tab sets inquiry_type", tabState.type === "Wholesale", String(tabState.type));
  check("wholesale tab sets the email subject", /wholesale/i.test(tabState.subject ?? ""), String(tabState.subject));
  check("wholesale tab makes Company required", tabState.companyRequired === true);
  check("wholesale tab marks the Company label", tabState.label === "Company *", String(tabState.label));

  await page.click('[data-tab="Product"]');
  await page.waitForTimeout(300);
  check(
    "switching back to Product releases the Company requirement",
    await page.evaluate(() => document.getElementById("l-company")?.required === false)
  );

  check("no page errors on desktop", errors.length === 0, errors.slice(0, 3).join(" | "));

  /* ---------------- reduced motion ---------------- */
  const rm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await rm.goto(`${BASE}/preview`, { waitUntil: "load" });
  await rm.waitForTimeout(1000);
  check("reduced motion — motion layer stays off", await rm.evaluate(() => !document.documentElement.classList.contains("motion")));
  const rmHidden = await rm.evaluate(() =>
    Array.from(document.querySelectorAll(".rise-inner")).filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.5).length
  );
  check("reduced motion — nothing left invisible", rmHidden === 0, `${rmHidden} hidden`);
  const rmLit = await rm.evaluate(() =>
    getComputedStyle(document.querySelector(".l-philosophy__line")).color
  );
  check("reduced motion — philosophy text at full strength", rmLit.includes("255, 255, 255"), rmLit);
  if (SHOTS) await rm.screenshot({ path: `${SHOTS}/05-reduced-motion.png`, fullPage: true });

  /* ---------------- mobile ---------------- */
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobErrors = [];
  mob.on("pageerror", (e) => mobErrors.push(String(e)));
  await mob.goto(`${BASE}/preview`, { waitUntil: "load" });
  await mob.waitForTimeout(1000);

  check("mobile — motion layer stays off", await mob.evaluate(() => !document.documentElement.classList.contains("motion")));
  const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("mobile — no horizontal overflow", overflow <= 0, `${overflow}px`);
  const mobFs = await mob.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  check("mobile — rem falls back to 1px", mobFs === "1px", mobFs);

  await mob.click(".l-burger > summary");
  await mob.waitForTimeout(400);
  check("mobile — nav opens", await mob.evaluate(() => document.querySelector(".l-burger")?.hasAttribute("open")));
  const tap = await mob.evaluate(() => {
    const r = document.querySelector(".l-burger > summary").getBoundingClientRect();
    return Math.min(r.width, r.height);
  });
  check("mobile — nav toggle meets the 44px touch target", tap >= 44, `${Math.round(tap)}px`);
  check("no page errors on mobile", mobErrors.length === 0, mobErrors.slice(0, 3).join(" | "));
  if (SHOTS) await mob.screenshot({ path: `${SHOTS}/06-mobile.png`, fullPage: true });

  await browser.close();

  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
