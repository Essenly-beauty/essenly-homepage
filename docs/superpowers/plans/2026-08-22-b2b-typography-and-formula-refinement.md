# Essenly B2B Typography and Formula Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the live 61747 B2B visual prototype's wordmark, type hierarchy, spacing and formula section so buyers can scan it without scroll-dependent hidden content.

**Architecture:** Keep the existing preserved B2B page as the source document and retain the transparent-illustration wrapper as the preview entry point. The wrapper fetches the source document through the brainstorm server's `/files/` route. A small Node static-source test protects the intentional visual contracts without introducing a browser or build dependency.

**Tech Stack:** Static HTML/CSS/inline SVG/vanilla JavaScript, Node.js `assert`, Superpowers brainstorm preview server.

---

### Task 1: Capture the preview's visual contracts

**Files:**
- Create: `essenly-homepage/tests/b2b-preview-refinement.spec.mjs`
- Test: `node tests/b2b-preview-refinement.spec.mjs`

- [ ] **Step 1: Write the failing source-contract test**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const preview = readFileSync(
  resolve(here, "../../.superpowers/brainstorm/17283-1786962059/content/b2b-existing-hero-ingredient-art.html"),
  "utf8"
);

assert.match(preview, /class="brand-mark"/, "RenewShell symbol renders in the header");
assert.match(preview, /class="brand">essenly</, "wordmark uses lowercase essenly");
assert.doesNotMatch(preview, /min-height:50vh/, "formula rows are not viewport-height");
assert.doesNotMatch(preview, /opacity:\.24/, "formula rows do not become unreadably faint");
assert.match(preview, /grid-template-columns:48px 132px minmax\(0,1fr\)/, "formula grid has number, illustration and copy columns");
assert.doesNotMatch(preview, /const formulas = new IntersectionObserver/, "formula readability does not depend on scroll state");

console.log("B2B preview refinement contracts pass");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/b2b-preview-refinement.spec.mjs`  
Expected: an assertion failure for the missing `brand-mark` symbol. The existing source still has `ESSENLY`, `min-height:50vh`, `opacity:.24` and a scroll-controlled formula observer.

- [ ] **Step 3: Commit the test when Git writes are available**

```bash
git add essenly-homepage/tests/b2b-preview-refinement.spec.mjs
git commit -m "test: cover B2B preview refinement contracts"
```

### Task 2: Refine the source preview's header and typography

**Files:**
- Modify: `.superpowers/brainstorm/17283-1786962059/content/b2b-existing-hero-ingredient-art.html`
- Test: `node tests/b2b-preview-refinement.spec.mjs`

- [ ] **Step 1: Add the type and spacing tokens**

Replace the page's root variables and global type declaration with the following values. This keeps the warm palette but removes Arial and makes the type roles explicit.

```css
:root {
  --ink: #27201b;
  --copy: #665d54;
  --paper: #f4efe8;
  --bright: #fbf8f3;
  --line: #d8cec3;
  --sage: #75856b;
  --sage-pale: #e6e9e0;
  --peach: #e9b393;
  --footer: #27201b;
  --display: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --sans: "Avenir Next", "Helvetica Neue", Arial, sans-serif;
  --ease: cubic-bezier(.22, 1, .36, 1);
}

body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--sans); }
h1, h2, h3 { font-family: var(--display); font-weight: 400; letter-spacing: -.028em; }
```

- [ ] **Step 2: Replace the header markup with the lowercase brand and inline symbol**

```html
<header class="top-bar">
  <nav class="shell nav">
    <a class="brand-lockup" href="#top" aria-label="essenly home">
      <svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 16.5C7.3 8.8 12.2 17.2 21 5.5" />
        <path d="M3 20C8.1 11.6 13.6 18.8 21 9" />
        <path d="M3.5 12.5C7.8 6.2 12 13.2 20.5 3.5" />
        <circle cx="15.4" cy="8.6" r="1.55" />
      </svg>
      <span class="brand">essenly</span>
    </a>
    <div class="nav-right"><span>Trade partners</span><a href="#inquiry">Wholesale inquiry</a></div>
  </nav>
</header>
```

```css
.nav { height: 72px; display: flex; align-items: center; justify-content: space-between; }
.brand-lockup { display: inline-flex; align-items: center; gap: 9px; color: var(--ink); text-decoration: none; }
.brand-mark { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.35; }
.brand-mark circle { fill: var(--peach); stroke: none; }
.brand { font: 600 23px/1 var(--display); letter-spacing: .015em; }
```

- [ ] **Step 3: Run the contract test**

Run: `node tests/b2b-preview-refinement.spec.mjs`  
Expected: it still fails because the Formula section has not yet changed.

### Task 3: Rebuild Formula at a glance as readable rows

**Files:**
- Modify: `.superpowers/brainstorm/17283-1786962059/content/b2b-existing-hero-ingredient-art.html`
- Test: `node tests/b2b-preview-refinement.spec.mjs`

- [ ] **Step 1: Replace the Formula CSS with a non-sticky heading and readable rows**

```css
.formula { padding: 120px 0; border-bottom: 1px solid var(--line); }
.formula-layout { display: block; }
.formula-intro { max-width: 660px; margin-bottom: 56px; }
.formula-intro h2 { max-width: 560px; margin: 0 0 20px; font-size: clamp(48px, 4vw, 56px); line-height: 1.02; }
.formula-intro > p:not(.eyebrow) { max-width: 42ch; margin: 0; color: var(--copy); font-size: 16px; line-height: 1.6; }
.formula-status { display: none; }
.formula-beats { border-bottom: 1px solid var(--line); }
.formula-beat { min-height: 224px; display: grid; grid-template-columns: 48px 132px minmax(0,1fr); gap: 32px; align-items: center; border-top: 1px solid var(--line); opacity: 1; transform: none; }
.formula-number { align-self: start; padding-top: 28px; color: var(--sage); font-size: 11px; font-weight: 700; letter-spacing: .1em; }
.ingredient-art { width: 124px; height: 124px; display: grid; place-items: center; overflow: visible; background: transparent; border: 0; }
.ingredient-art svg { width: 100%; height: 100%; overflow: visible; }
.ingredient-copy h3 { margin: 0 0 13px; font-size: clamp(40px, 3.2vw, 44px); line-height: 1; }
.ingredient-copy p { max-width: 38ch; margin: 0; color: var(--copy); font-size: 16px; line-height: 1.6; }
```

- [ ] **Step 2: Replace the formula observer with readable static content**

Delete the `formula-status` lookup, the `formulas` `IntersectionObserver`, and the final `document.querySelectorAll('.formula-beat')` observer registration. Keep the existing header, product stage, reveal and form-choice behavior.

- [ ] **Step 3: Add the mobile formula rules**

```css
@media (max-width: 800px) {
  .nav { height: 64px; }
  .formula { padding: 76px 0; }
  .formula-intro { margin-bottom: 48px; }
  .formula-intro h2 { font-size: 40px; line-height: 1.06; }
  .formula-beat { min-height: 0; grid-template-columns: 36px 96px minmax(0,1fr); gap: 16px; padding: 26px 0; }
  .formula-number { padding-top: 2px; }
  .ingredient-art { width: 96px; height: 96px; }
  .ingredient-copy h3 { font-size: 32px; line-height: 1.04; }
  .ingredient-copy p { font-size: 16px; }
}
```

- [ ] **Step 4: Run the contract test to verify the refinement**

Run: `node tests/b2b-preview-refinement.spec.mjs`  
Expected: `B2B preview refinement contracts pass`.

- [ ] **Step 5: Commit the preview changes when Git writes are available**

```bash
git add .superpowers/brainstorm/17283-1786962059/content/b2b-existing-hero-ingredient-art.html essenly-homepage/tests/b2b-preview-refinement.spec.mjs
git commit -m "feat: refine B2B formula presentation"
```

### Task 4: Verify the browser preview

**Files:**
- Verify: `http://127.0.0.1:61747/`

- [ ] **Step 1: Keep the existing brainstorm server open**

Run in one Terminal and leave it running:

```bash
BRAINSTORM_DIR="/Users/hanmyeong-gwan/mobile_design/.superpowers/brainstorm/17283-1786962059" \
BRAINSTORM_PORT=61747 \
BRAINSTORM_HOST=127.0.0.1 \
BRAINSTORM_URL_HOST=localhost \
node "/Users/hanmyeong-gwan/.agents/skills/superpowers/skills/brainstorming/scripts/server.cjs"
```

- [ ] **Step 2: Review responsive behavior**

Open `http://127.0.0.1:61747/` at 1440px, 768px and 390px. Confirm that the header keeps its wordmark and symbol, all three formula items are fully readable, and the page has no horizontal overflow.

- [ ] **Step 3: Collect design feedback**

Review the updated Formula section and header with the user before expanding the first pass into the product, partnership, terms or inquiry sections.
