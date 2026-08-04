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

  await page.goto(`${BASE}/`, { waitUntil: "load" });
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

  /* Measured against clientWidth, not innerWidth: they are equal under macOS
     overlay scrollbars but differ by ~15px wherever the scrollbar takes space,
     and clientWidth is the box a fixed element is actually laid out in. */
  const alignment = await page.evaluate(() => {
    const hero = document.getElementById("l-hero-bg").getBoundingClientRect();
    const content = document.querySelector(".l-info .container").getBoundingClientRect();
    return {
      heroCentre: (hero.left + hero.right) / 2,
      contentCentre: (content.left + content.right) / 2,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
    };
  });
  near(alignment.heroCentre, alignment.contentCentre, 1, "hero at rest — centred on the content column, not the window");

  // Expand: 480px of scroll takes it to fullscreen.
  await scrollTo(page, 480);
  const full = await heroRect(page);
  near(full.width, alignment.clientWidth, 12, "after expand — fills the layout viewport width");
  near(full.height, 900, 12, "after expand — fills viewport height");
  const overhang = await page.evaluate(
    () => document.getElementById("l-hero-bg").getBoundingClientRect().right - document.documentElement.clientWidth
  );
  check("after expand — no overhang past the layout viewport", overhang <= 1, `${overhang.toFixed(1)}px`);
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
    slotB: document.getElementById("l-slot-b")?.classList.contains("is-revealed"),
  }));
  check("morph complete — hero hidden", landed.morphed);
  check("morph complete — inline slot revealed", landed.revealed);
  check("companion slot B revealed before the headline is read", landed.slotB === true);
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

  // Wordmark shrink locks after its range, and the lock brings the frosted bar
  // that keeps near-black nav text legible over the #101010 bands.
  await scrollTo(page, 400);
  check("wordmark locked after shrink range", await page.evaluate(() => document.getElementById("l-header").classList.contains("is-locked")));
  const frostOn = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.getElementById("l-header"), "::before").opacity)
  );
  check("frosted header bar visible once locked", frostOn > 0.9, `opacity ${frostOn}`);
  await scrollTo(page, 0);
  await page.waitForTimeout(600);
  check("wordmark unlocks back at the top", await page.evaluate(() => !document.getElementById("l-header").classList.contains("is-locked")));
  const frostOff = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.getElementById("l-header"), "::before").opacity)
  );
  check("frost fades away at the top", frostOff < 0.1, `opacity ${frostOff}`);

  /* Philosophy lines light up — and light BEFORE the eye reaches them. The
     trigger band is 77% of the viewport, so any line above 73% while unlit
     means the reader saw failing 45%-white text mid-screen. */
  await scrollTo(page, 3000);
  const phil = await page.evaluate(() => {
    const vh = window.innerHeight;
    const lines = Array.from(document.querySelectorAll(".l-philosophy__line"));
    return {
      lit: lines.filter((el) => el.classList.contains("is-lit")).length,
      late: lines
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.bottom > 0 && r.top < vh * 0.73 && !el.classList.contains("is-lit");
        })
        .map((el) => (el.textContent || "").trim().slice(0, 32)),
    };
  });
  check("philosophy lines light on arrival", phil.lit > 0, `${phil.lit} of 4 lit`);
  check("no unlit line above the 73% band", phil.late.length === 0, phil.late.join(" | "));

  /* A hard jump must settle fast: land the archive section mid-viewport, allow
     650ms — less than the old 0.9s tween that trailed the scroll — and require
     its images to be fully in. This is the regression trap for reveal latency. */
  const archiveY = await page.evaluate(() => {
    const el = document.querySelector(".l-archive__imgs");
    return Math.round(el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.55);
  });
  await page.evaluate((y) => window.scrollTo(0, y), archiveY);
  await page.waitForTimeout(650);
  const trailing = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".l-archive__imgs .rise-inner")).filter(
      (el) => parseFloat(getComputedStyle(el).opacity) < 0.9
    ).length
  );
  check("hard jump — archive images settled within 650ms", trailing === 0, `${trailing} trailing`);

  /* Rise reveals actually reveal rather than leaving content invisible.

     Measured on the OUTER .rise clip. The inner is translated while hidden, so
     filtering on its rect classified a hidden pictorial image as "990px below
     the viewport" and skipped it — which is how an earlier version of this suite
     passed while whole sections were visibly empty mid-screen. The clip's box is
     where the reader sees the hole. */
  const hidden = await page.evaluate(() => {
    const EDGE = 40; // allow the literal bottom edge, where a tween may just be starting
    return Array.from(document.querySelectorAll(".rise"))
      .filter((outer) => {
        const r = outer.getBoundingClientRect();
        const inView = r.top < window.innerHeight - EDGE && r.bottom > 0;
        const inner = outer.querySelector(":scope > .rise-inner");
        return inView && inner && parseFloat(getComputedStyle(inner).opacity) < 0.5;
      })
      .map((outer) => (outer.textContent || "").trim().slice(0, 40));
  });
  check("no in-view slot left empty by a rise (measured on the clip)", hidden.length === 0, hidden.join(" | "));

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

  /* The inquiry selector is a radiogroup, not a tablist: it swaps no panels, so
     role="tab" would promise a tabpanel that does not exist. */
  const groupRoles = await page.evaluate(() => ({
    group: document.querySelector(".l-tabs")?.getAttribute("role"),
    item: document.querySelector(".l-tab")?.getAttribute("role"),
    checked: document.querySelectorAll('.l-tab[aria-checked="true"]').length,
    focusable: Array.from(document.querySelectorAll(".l-tab")).filter((t) => t.tabIndex === 0).length,
    orphanTabs: document.querySelectorAll('[role="tab"]').length,
    panels: document.querySelectorAll('[role="tabpanel"]').length,
  }));
  check("inquiry selector is a radiogroup", groupRoles.group === "radiogroup" && groupRoles.item === "radio", `${groupRoles.group}/${groupRoles.item}`);
  check("exactly one option checked", groupRoles.checked === 1, String(groupRoles.checked));
  check("roving tabindex — one stop in the tab order", groupRoles.focusable === 1, String(groupRoles.focusable));
  check("no role=tab without a tabpanel", groupRoles.orphanTabs === 0 || groupRoles.panels > 0);

  /* Contrast of the accent text actually rendered, on the ground it sits on. */
  const contrast = await page.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => s.match(/\d+/g).slice(0, 3).map(Number);
    const groundOf = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && !bg.includes("rgba(0, 0, 0, 0)")) return parse(bg);
        n = n.parentElement;
      }
      return [255, 255, 255];
    };
    return Array.from(document.querySelectorAll(".eyebrow span")).map((el) => {
      const fg = parse(getComputedStyle(el).color);
      const bg = groundOf(el);
      const [hi, lo] = lum(fg) > lum(bg) ? [lum(fg), lum(bg)] : [lum(bg), lum(fg)];
      return { text: el.textContent.trim().slice(0, 28), ratio: +(((hi + 0.05) / (lo + 0.05)).toFixed(2)) };
    });
  });
  const lowContrast = contrast.filter((c) => c.ratio < 4.5);
  check(
    "every eyebrow label clears 4.5:1 on its own ground",
    lowContrast.length === 0,
    lowContrast.map((c) => `${c.text} ${c.ratio}`).join(" | ")
  );

  check("no page errors on desktop", errors.length === 0, errors.slice(0, 3).join(" | "));

  /* ---------------- reduced motion ---------------- */
  const rm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await rm.goto(`${BASE}/`, { waitUntil: "load" });
  await rm.waitForTimeout(1000);
  check("reduced motion — motion layer stays off", await rm.evaluate(() => !document.documentElement.classList.contains("motion")));
  check(
    "reduced motion — header frost always on (no lock moment exists)",
    await rm.evaluate(
      () => parseFloat(getComputedStyle(document.querySelector(".l-header"), "::before").opacity) > 0.9
    )
  );
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
  const mobRequests = [];
  mob.on("pageerror", (e) => mobErrors.push(String(e)));
  mob.on("request", (r) => mobRequests.push(r.url()));
  await mob.goto(`${BASE}/`, { waitUntil: "load" });
  await mob.waitForTimeout(1500);

  check("mobile — motion layer stays off", await mob.evaluate(() => !document.documentElement.classList.contains("motion")));

  /* The motion layer is ~136KB of vendor code that a phone will never execute,
     so it must not be fetched either. This is the assertion that would catch a
     regression back to a static import. */
  const vendorPulled = mobRequests.filter((u) => /gsap|lenis|landing-motion/i.test(u));
  check(
    "mobile — GSAP/Lenis never downloaded",
    vendorPulled.length === 0,
    vendorPulled.map((u) => u.split("/").pop()).join(", ")
  );
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

  /* Deferring the motion import behind a media query is only safe if widening the
     window still brings it in. Without the change listener a visitor who loads
     narrow and then maximises stays on the static page for the whole session. */
  await mob.setViewportSize({ width: 1440, height: 900 });
  await mob.waitForTimeout(2500);
  check(
    "resizing up to desktop boots the motion layer",
    await mob.evaluate(() => document.documentElement.classList.contains("motion"))
  );
  check(
    "resizing up to desktop fetches the motion chunk",
    mobRequests.some((u) => /gsap|lenis|landing-motion/i.test(u))
  );

  /* ---------------- legal pages ----------------
     These share the landing's header, footer and tokens. The check that matters
     is that they were actually migrated, not left on the old cream layout. */
  const legal = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const path of ["/privacy", "/terms", "/thank-you"]) {
    await legal.goto(`${BASE}${path}`, { waitUntil: "load" });
    await legal.waitForTimeout(400);
    const state = await legal.evaluate(() => ({
      header: !!document.querySelector(".l-header"),
      footer: !!document.querySelector(".l-footer"),
      body: getComputedStyle(document.body).backgroundColor,
      heading: document.querySelector("h1")?.textContent?.trim(),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }));
    check(`${path} — uses the landing header and footer`, state.header && state.footer);
    check(`${path} — on the new palette`, state.body === "rgb(255, 255, 255)", state.body);
    check(`${path} — has a heading`, Boolean(state.heading), state.heading ?? "(none)");
    check(`${path} — no horizontal overflow`, state.overflow <= 0, `${state.overflow}px`);
  }

  await browser.close();

  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
