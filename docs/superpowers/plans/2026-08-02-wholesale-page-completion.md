# Wholesale Page Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish `/wholesale` — populate the wholesale terms data, make the inquiry form actually submit, and wire up the hero image.

**Architecture:** Static Astro site, no adapter and no server runtime. Form submissions go to Web3Forms, which emails them and redirects the browser to a new `/thank-you` page. All wholesale facts live in one `siteConfig` object; the page derives its tables from it.

**Tech Stack:** Astro 6, plain CSS (`src/styles/global.css` + per-page scoped `<style>`), no framework components, no build-time image pipeline (files in `public/` are served as-is).

## Global Constraints

- **No test runner exists in this repo.** `package.json` has no `test` script and no test dependency. Do not invent one. Each task's test cycle is `npm run build` followed by `grep` assertions against the generated `dist/` HTML. These are real, runnable checks — treat a failing grep exactly like a failing unit test.
- **`npm run build` does not type-check.** Astro strips types with esbuild; `astro check` would type-check but needs `@astrojs/check` and `typescript` installed, which this plan deliberately does not add. The practical consequence: when Task 1 deletes `wholesale.openingMoq`, a leftover reference does **not** fail the build — it evaluates to `undefined` and the row is silently filtered out of the table. The grep assertions are what catch that, which is why every removed field has a corresponding `assert_contains` on the text that replaces it. Never treat a green build as proof on its own.
- **Never publish a per-unit wholesale price.** Tier *quantities* are public; dollar figures are not. The only dollar figure allowed anywhere on `/wholesale` is the `$39.00` MSRP.
- **Product name is exactly** `Essenly RenewShell™ Intense Hydrating Hair Mask` (brand + SKU, matching the jar label).
- **Net weight is exactly** `190ml`. The shipping quote's "200ml" is wrong; do not use it.
- **The page says "U.S. stock", never "Amazon"**, when describing sample fulfilment.
- English only. Never copy Korean strings into the site.
- The repo has no linter or formatter hook. Match the surrounding file's style: double quotes, two-space indent, semicolons.
- Work on branch `feat/wholesale-completion`. The hero image file is already committed there.

---

### Task 1: Wholesale data model and tables

Replaces the three loose MOQ strings with a tier array, fills every `null` term, and renders a tier table. Nothing else in the page works until the data model settles, so this goes first.

**Files:**
- Modify: `src/data/siteConfig.ts`
- Modify: `src/pages/wholesale.astro` (frontmatter rows, terms section markup, scoped styles)
- Test: `npm run build` + grep on `dist/wholesale/index.html`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `WholesaleTier` type (`{ label: string; units: number; cases: number }`), exported from `src/data/siteConfig.ts`. `siteConfig.wholesale.tiers: WholesaleTier[]` and `siteConfig.wholesale.sampleTerms: string`. Task 3 reads `siteConfig.contact.wholesaleEmail` only, which is unchanged.

- [ ] **Step 1: Write the failing test**

Create `scripts/check-build.sh` — this is the plan's test harness and later tasks add cases to it.

```bash
#!/usr/bin/env bash
# Build-output assertions. Run after `npm run build`.
set -uo pipefail

FAILED=0
WHOLESALE="dist/wholesale/index.html"

assert_contains() {
  local file="$1" needle="$2" label="$3"
  if grep -qF -- "$needle" "$file"; then
    echo "  PASS  $label"
  else
    echo "  FAIL  $label — expected to find: $needle"
    FAILED=1
  fi
}

assert_absent() {
  local file="$1" needle="$2" label="$3"
  if [ ! -f "$file" ]; then
    echo "  FAIL  $label — file missing: $file"
    FAILED=1
  elif grep -qF -- "$needle" "$file"; then
    echo "  FAIL  $label — should not appear: $needle"
    FAILED=1
  else
    echo "  PASS  $label"
  fi
}

echo "Task 1 — wholesale data"
assert_contains "$WHOLESALE" "190ml" "net weight renders"
assert_contains "$WHOLESALE" "\$39.00" "MSRP renders"
assert_contains "$WHOLESALE" "Essenly RenewShell" "product name renders"
assert_contains "$WHOLESALE" "100% prepayment on all orders" "payment terms render"
assert_contains "$WHOLESALE" "6-10 business days" "lead time renders"
assert_contains "$WHOLESALE" "Ships from Seoul, Korea" "fulfillment origin renders"
assert_contains "$WHOLESALE" "Damaged or defective units only" "return terms render"
assert_contains "$WHOLESALE" "Ships DDP" "DDP shipping row renders"
assert_contains "$WHOLESALE" "Opening order" "glance opening-order row renders"
assert_contains "$WHOLESALE" "Minimum order" "terms minimum-order row renders"
assert_contains "$WHOLESALE" "30 units (one case)" "opening quantity renders"
assert_contains "$WHOLESALE" "credited against your first order" "sample terms render"
assert_contains "$WHOLESALE" "Key account" "fourth tier renders"
assert_contains "$WHOLESALE" "10 cases" "largest tier renders"
assert_absent "$WHOLESALE" "\$21.00" "opening tier price stays private"
assert_absent "$WHOLESALE" "\$15.60" "key account price stays private"
assert_absent "$WHOLESALE" "200ml" "wrong net weight absent"

exit $FAILED
```

Make it executable:

```bash
chmod +x scripts/check-build.sh
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && ./scripts/check-build.sh`
Expected: FAIL — `190ml`, `$39.00`, `Essenly RenewShell`, payment terms, lead time, fulfillment origin, return terms, DDP row and `Key account` all missing, because those `siteConfig` fields are still `null` and the tier table does not exist.

- [ ] **Step 3: Add the tier type and fill the data**

In `src/data/siteConfig.ts`, add the type after `WholesaleSupportAsset`:

```ts
export type WholesaleTier = {
  label: string;
  units: number;
  cases: number;
};
```

Replace the `product` block's `name` and `netWeight`:

```ts
  product: {
    name: "Essenly RenewShell™ Intense Hydrating Hair Mask",
    type: "Rinse-out conditioning hair treatment",
    netWeight: "190ml",
    countryOfOrigin: "Made in Korea",
    madeIn: "Korea",
    fragrance: "Amber Vanilla",
    useTime: "5-7 minutes",
    hairTypes: "Dry, frizzy and color-treated hair",
    inci: null as string | null,
    cautions: null as string | null,
  },
```

Replace the whole `wholesale` block:

```ts
  wholesale: {
    msrp: "$39.00",
    tiers: [
      { label: "Opening", units: 30, cases: 1 },
      { label: "Growth", units: 90, cases: 3 },
      { label: "Volume", units: 150, cases: 5 },
      { label: "Key account", units: 300, cases: 10 },
    ] as WholesaleTier[],
    fulfillmentOrigin: "Ships from Seoul, Korea",
    paymentTerms: "100% prepayment on all orders (wire transfer or card)",
    leadTime: "6-10 business days from payment — 3-5 business days to dispatch, 3-5 business days in transit",
    returnTerms: "Damaged or defective units only, reported with photos within 7 days of delivery",
    samplesAvailable: true,
    sampleTerms:
      "Available to qualified buyers at cost, credited against your first order. Ships from U.S. stock, typically 2-3 business days.",
  },
```

`openingMoq`, `standardMoq` and `volumeMoq` are gone. The `as WholesaleTier[]` cast matches the existing pattern used by `reviews` and `supportAssets`, and keeps the array mutable-typed so `.map()` works inside the `as const` object.

- [ ] **Step 4: Rewrite the derived rows in `wholesale.astro`**

In the frontmatter, replace the `glanceRows` and `termRows` definitions:

```ts
const tiers = wholesale.tiers;
const openingTier = tiers[0];

const glanceRows = [
  ["Product type", "Premium rinse-out hair treatment"],
  ["Made in", product.madeIn],
  ["Fragrance", product.fragrance],
  ["Recommended customer", "Customers with dry, frizzy, color-treated or difficult-to-manage hair"],
  ["Recommended use", `${product.useTime} after shampooing`],
  ["Net weight", product.netWeight],
  ["Current U.S. retail price", wholesale.msrp],
  ["Opening order", openingTier ? `From ${openingTier.units} units (one case)` : null],
  ["Wholesale price", "Available upon qualified inquiry"],
  ["Fulfillment", wholesale.fulfillmentOrigin],
].filter((row): row is [string, string] => Boolean(row[1]));

const termRows = [
  ["Minimum order", openingTier ? `${openingTier.units} units (one case)` : null],
  ["Wholesale pricing", "Provided based on order volume"],
  ["Payment", wholesale.paymentTerms],
  [
    "Shipping",
    "Ships DDP — Essenly pays customs and duties. Freight quoted by order size and destination",
  ],
  ["Lead time", wholesale.leadTime],
  ["Samples", wholesale.sampleTerms],
  ["Returns", wholesale.returnTerms],
  ["Online resale", "Subject to channel approval"],
  ["Exclusivity", "Not available for opening orders"],
].filter((row): row is [string, string] => Boolean(row[1]));
```

The old "Volume pricing" glance row is dropped — the tier table covers it.

- [ ] **Step 5: Replace the Wholesale terms section markup**

Find the section starting `<section class="section sage-band">` that contains `<p class="eyebrow">Wholesale terms</p>` and replace the whole section with:

```astro
  <section class="section sage-band">
    <div class="container">
      <div class="section-title">
        <p class="eyebrow">Wholesale terms</p>
        <h2>Designed for a practical opening order.</h2>
        <p class="lead">
          Opening order from {openingTier.units} units (one case). Volume pricing available at
          {tiers.slice(1).map((tier) => tier.units).join(", ")} units.
        </p>
        <p class="muted">
          Wholesale pricing, shipping and lead times are confirmed against your business type,
          order quantity and destination.
        </p>
      </div>
      <div class="tier-table">
        <div class="tier-head">
          <span>Tier</span>
          <span>Units</span>
          <span>Cases</span>
        </div>
        {tiers.map((tier) => (
          <div class="tier-row">
            <span>{tier.label}</span>
            <span>{tier.units}</span>
            <span>{tier.cases === 1 ? "1 case" : `${tier.cases} cases`}</span>
          </div>
        ))}
      </div>
      <dl class="details-list">
        {termRows.map(([label, value]) => (
          <div>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
```

This drops the `data-section` two-column grid for this section and uses `.section-title` instead, matching the "retail opportunity" section above it.

- [ ] **Step 6: Add tier table styles**

In `wholesale.astro`'s `<style>` block, add after the `.details-list dd` rule:

```css
  .tier-table {
    display: grid;
    margin-bottom: var(--space-7);
    border-top: 1px solid rgba(36, 30, 25, 0.18);
  }

  .tier-head,
  .tier-row {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: var(--space-4);
    padding-block: var(--space-3);
    border-bottom: 1px solid rgba(36, 30, 25, 0.18);
  }

  .tier-head {
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .tier-row span:first-child {
    font-weight: 800;
  }

  .tier-row span:not(:first-child) {
    color: var(--color-muted);
  }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run build && ./scripts/check-build.sh`
Expected: every Task 1 assertion PASS.

A green build proves nothing here — see Global Constraints. If you left a reference to the
deleted `openingMoq`, the build still succeeds and the row just vanishes from the rendered
table. The `Minimum order` and `Opening order` assertions are what catch it.

- [ ] **Step 8: Commit**

```bash
git add src/data/siteConfig.ts src/pages/wholesale.astro scripts/check-build.sh
git commit -m "feat(wholesale): fill terms data and render the tier ladder

Replaces openingMoq/standardMoq/volumeMoq with a tiers array so the
four-step ladder has one source of truth, and fills every null term.
Tier quantities are published; per-unit prices are not."
```

---

### Task 2: Thank-you page

The redirect target for both forms. Built before the forms so they have somewhere to point.

**Files:**
- Create: `src/pages/thank-you.astro`
- Modify: `astro.config.mjs`
- Test: `scripts/check-build.sh`

**Interfaces:**
- Consumes: `siteConfig.contact.wholesaleEmail` from `src/data/siteConfig.ts`.
- Produces: the route `/thank-you`, built to `dist/thank-you/index.html`. Tasks 3 and 4 point their `redirect` hidden field at `https://essenly.beauty/thank-you`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/check-build.sh`, immediately before the final `exit $FAILED`:

```bash
echo "Task 2 — thank-you page"
THANKYOU="dist/thank-you/index.html"
if [ -f "$THANKYOU" ]; then
  echo "  PASS  /thank-you is built"
  assert_contains "$THANKYOU" "Thank you" "thank-you heading renders"
  assert_contains "$THANKYOU" "wholesale@essenly.beauty" "fallback email renders"
else
  echo "  FAIL  /thank-you is built — dist/thank-you/index.html missing"
  FAILED=1
fi
assert_absent "dist/sitemap-0.xml" "/thank-you" "thank-you excluded from sitemap"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && ./scripts/check-build.sh`
Expected: Task 1 assertions PASS, Task 2 FAILs with "dist/thank-you/index.html missing".

- [ ] **Step 3: Create the page**

Create `src/pages/thank-you.astro`:

```astro
---
import Base from "../layouts/Base.astro";
import { siteConfig } from "../data/siteConfig";

const wholesaleEmail = siteConfig.contact.wholesaleEmail;
---

<Base
  title="Thank you"
  description="Your inquiry has reached the Essenly team."
  canonicalPath="/thank-you"
>
  <section class="section">
    <div class="narrow stack thanks">
      <p class="eyebrow">Inquiry received</p>
      <h1>Thank you.</h1>
      <p class="lead">
        Your inquiry has reached the Essenly team. We reply to wholesale and sample requests
        within two business days.
      </p>
      <p class="muted">
        If your message is urgent, email <a href={`mailto:${wholesaleEmail}`}>{wholesaleEmail}</a>
        directly.
      </p>
      <div class="button-row">
        <a class="btn btn-primary" href="/wholesale">Back to Wholesale</a>
        <a class="btn btn-secondary" href="/">Return Home</a>
      </div>
    </div>
  </section>
</Base>

<style>
  .thanks {
    text-align: center;
  }

  .thanks .button-row {
    justify-content: center;
  }

  .thanks a {
    color: var(--color-accent-dark);
    font-weight: 800;
  }
</style>
```

- [ ] **Step 4: Keep it out of the sitemap**

A post-submit confirmation page has no business in search results. Replace the `integrations` line in `astro.config.mjs`:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://essenly.beauty',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/thank-you'),
    }),
  ],
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run build && ./scripts/check-build.sh`
Expected: all Task 1 and Task 2 assertions PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/thank-you.astro astro.config.mjs scripts/check-build.sh
git commit -m "feat(pages): add /thank-you, excluded from sitemap

Shared post-submit destination for the wholesale and contact forms."
```

---

### Task 3: Wholesale form on Web3Forms

Turns the wholesale form from a `mailto:` fallback into a real submission, and makes the hero's existing "Request a Sample" button mean something.

**Files:**
- Modify: `src/pages/wholesale.astro` (frontmatter, hero buttons, form markup, scoped styles)
- Modify: `README.md`
- Test: `scripts/check-build.sh`

**Interfaces:**
- Consumes: the `/thank-you` route from Task 2.
- Produces: the env var contract `PUBLIC_WEB3FORMS_KEY`, which Task 4 reuses verbatim. Form field names emitted: `access_key`, `subject`, `from_name`, `redirect`, `botcheck`, `inquiry_type`, `business_name`, `contact_name`, `email`, `website`, `business_type`, `city_state`, `estimated_order`, `message`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/check-build.sh` before the final `exit $FAILED`:

```bash
echo "Task 3 — wholesale form"
assert_contains "$WHOLESALE" "https://api.web3forms.com/submit" "form posts to Web3Forms"
assert_contains "$WHOLESALE" 'name="access_key"' "access key field present"
assert_contains "$WHOLESALE" 'name="redirect"' "redirect field present"
assert_contains "$WHOLESALE" "https://essenly.beauty/thank-you" "redirect points at thank-you"
assert_contains "$WHOLESALE" 'name="botcheck"' "Web3Forms honeypot present"
assert_contains "$WHOLESALE" 'name="inquiry_type"' "inquiry type radio present"
assert_contains "$WHOLESALE" 'data-inquiry-type="Sample"' "sample button tagged for preselect"
assert_absent "$WHOLESALE" 'name="company_website"' "old honeypot removed"
assert_absent "$WHOLESALE" 'name="sample_request"' "old sample checkbox removed"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PUBLIC_WEB3FORMS_KEY=test-key-000 npm run build && ./scripts/check-build.sh`
Expected: Task 3 assertions FAIL. Without the env var the form does not render at all; with a dummy key it renders the *old* markup, so the Web3Forms fields are still missing and `company_website` / `sample_request` are still present.

- [ ] **Step 3: Swap the env var in the frontmatter**

In `src/pages/wholesale.astro`, replace these two lines:

```ts
const endpoint = import.meta.env.WHOLESALE_FORM_ENDPOINT as string | undefined;
const showForm = Boolean(endpoint);
```

with:

```ts
const web3formsKey = import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined;
const showForm = Boolean(web3formsKey);
const thankYouUrl = new URL("/thank-you", Astro.site ?? "https://essenly.beauty").toString();
```

- [ ] **Step 4: Tag the hero buttons**

Replace the hero `button-row`:

```astro
        <div class="button-row">
          <a class="btn btn-primary" href="#inquiry" data-inquiry-type="Wholesale pricing">
            Request Wholesale Information
          </a>
          <a class="btn btn-secondary" href="#inquiry" data-inquiry-type="Sample">
            Request a Sample
          </a>
        </div>
```

- [ ] **Step 5: Replace the form markup**

Replace the entire `<form class="inquiry-form" …>…</form>` element with:

```astro
        <form class="inquiry-form" action="https://api.web3forms.com/submit" method="post">
          <input type="hidden" name="access_key" value={web3formsKey} />
          <input type="hidden" name="subject" value="New wholesale inquiry — Essenly" />
          <input type="hidden" name="from_name" value="Essenly Wholesale" />
          <input type="hidden" name="redirect" value={thankYouUrl} />
          <input type="checkbox" name="botcheck" class="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <fieldset class="inquiry-type">
            <legend>What are you looking for?</legend>
            <label><input type="radio" name="inquiry_type" value="Wholesale pricing" required /> Wholesale pricing</label>
            <label><input type="radio" name="inquiry_type" value="Sample" /> Sample</label>
            <label><input type="radio" name="inquiry_type" value="Both" /> Both</label>
          </fieldset>
          <div class="form-grid">
            <div class="field">
              <label for="business-name">Business name</label>
              <input id="business-name" name="business_name" autocomplete="organization" required />
            </div>
            <div class="field">
              <label for="contact-name">Contact name</label>
              <input id="contact-name" name="contact_name" autocomplete="name" required />
            </div>
            <div class="field">
              <label for="email">Business email</label>
              <input id="email" name="email" type="email" autocomplete="email" required />
            </div>
            <div class="field">
              <label for="website">Website or social account</label>
              <input id="website" name="website" autocomplete="url" />
            </div>
            <div class="field">
              <label for="business-type">Business type</label>
              <select id="business-type" name="business_type" required>
                <option value="">Select one</option>
                <option>Retail Store</option>
                <option>K-Beauty Store</option>
                <option>Hair Salon / Head Spa</option>
                <option>Spa / Wellness</option>
                <option>Online Store</option>
                <option>Distributor</option>
                <option>Other</option>
              </select>
            </div>
            <div class="field">
              <label for="city-state">City and state</label>
              <input id="city-state" name="city_state" required />
            </div>
            <div class="field full">
              <label for="order-size">Estimated opening order</label>
              <select id="order-size" name="estimated_order">
                <option value="">Select one</option>
                <option>30 units (one case)</option>
                <option>90 units</option>
                <option>150 units</option>
                <option>300+ units</option>
              </select>
            </div>
            <div class="field full">
              <label for="message">Message</label>
              <textarea id="message" name="message" required></textarea>
            </div>
          </div>
          <button class="btn btn-light" type="submit">Start a Wholesale Conversation</button>
          <p class="fine-print">By submitting, you agree that Essenly may use your information to respond to your inquiry.</p>
        </form>
```

Two things changed beyond the Web3Forms plumbing. The `sample_request` checkbox is gone, replaced by the `inquiry_type` radio. And the `estimated_order` options now match the published tiers — the old "Under 50 / 50-149 / 150-299" buckets do not line up with a 30-unit case pack.

- [ ] **Step 6: Add the preselect script**

At the very end of `wholesale.astro`, after the closing `</style>`, add:

```astro
<script is:inline>
  document.querySelectorAll("a[data-inquiry-type]").forEach((link) => {
    link.addEventListener("click", () => {
      const value = link.getAttribute("data-inquiry-type");
      const radio = document.querySelector(
        'input[name="inquiry_type"][value="' + value + '"]'
      );
      if (radio) radio.checked = true;
    });
  });
</script>
```

Progressive enhancement only. With JavaScript off both buttons still scroll to the form and the buyer picks the radio themselves.

- [ ] **Step 7: Style the radio group and drop the dead checkbox rule**

In `wholesale.astro`'s `<style>` block, delete the `.checkbox-field`, `.checkbox-field label` and `.checkbox-field input` rules — the field they styled no longer exists. Add in their place:

```css
  .inquiry-type {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    border: 0;
  }

  .inquiry-type legend {
    margin-bottom: var(--space-2);
    padding: 0;
    color: var(--color-surface);
    font-weight: 800;
  }

  .inquiry-type label {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    min-height: 44px;
  }

  .inquiry-type input {
    width: auto;
    min-height: auto;
  }
```

- [ ] **Step 8: Document the env var**

In `README.md`, replace the `## Launch Notes` section with:

```markdown
## Environment

| Variable | Purpose |
| --- | --- |
| `PUBLIC_WEB3FORMS_KEY` | Web3Forms access key. Both the wholesale and contact forms fall back to a `mailto:` link when it is unset. |

Set it in the Vercel project settings for production and previews, and in a local
`.env` for development. The `PUBLIC_` prefix is deliberate — this is a static build, so
the value is inlined into the HTML, and Web3Forms access keys are designed to be public.

## Launch Notes

Before production launch, confirm company contact details, legal text, the customs
clearance fee and duty rate behind the private wholesale rate card, and the remaining
product imagery.
```

- [ ] **Step 9: Run test to verify it passes**

Run: `PUBLIC_WEB3FORMS_KEY=test-key-000 npm run build && ./scripts/check-build.sh`
Expected: all Task 1-3 assertions PASS.

Then confirm the fallback still works:

Run: `npm run build && grep -c "api.web3forms.com" dist/wholesale/index.html`
Expected: `0` — with no key set, the form is replaced by the `mailto:` panel.

- [ ] **Step 10: Commit**

```bash
git add src/pages/wholesale.astro README.md scripts/check-build.sh
git commit -m "feat(wholesale): submit the inquiry form via Web3Forms

Replaces the unset WHOLESALE_FORM_ENDPOINT with PUBLIC_WEB3FORMS_KEY and
redirects to /thank-you on success.

The honeypot is renamed company_website -> botcheck; the old name was not
one Web3Forms inspects, so it filtered nothing. The sample_request
checkbox becomes a required inquiry_type radio, which finally gives the
hero's 'Request a Sample' button a distinct outcome. Estimated-order
buckets now line up with the 30-unit case pack."
```

---

### Task 4: Contact form on Web3Forms

Same treatment, one page over. The contact form shares the wholesale form's pattern and its broken honeypot, and both draw on the same Web3Forms quota.

**Files:**
- Modify: `src/pages/contact.astro`
- Test: `scripts/check-build.sh`

**Interfaces:**
- Consumes: `PUBLIC_WEB3FORMS_KEY` and the `/thank-you` route.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

Append to `scripts/check-build.sh` before the final `exit $FAILED`:

```bash
echo "Task 4 — contact form"
CONTACT="dist/contact/index.html"
assert_contains "$CONTACT" "https://api.web3forms.com/submit" "contact form posts to Web3Forms"
assert_contains "$CONTACT" 'name="access_key"' "contact access key field present"
assert_contains "$CONTACT" "https://essenly.beauty/thank-you" "contact redirect points at thank-you"
assert_contains "$CONTACT" 'name="botcheck"' "contact honeypot present"
assert_absent "$CONTACT" 'name="company_website"' "old contact honeypot removed"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PUBLIC_WEB3FORMS_KEY=test-key-000 npm run build && ./scripts/check-build.sh`
Expected: Tasks 1-3 PASS, Task 4 FAILs — `contact.astro` still reads `CONTACT_FORM_ENDPOINT`, which is unset, so no form renders at all.

- [ ] **Step 3: Swap the env var in the frontmatter**

In `src/pages/contact.astro`, replace:

```ts
const endpoint = import.meta.env.CONTACT_FORM_ENDPOINT as string | undefined;
const showForm = Boolean(endpoint);
```

with:

```ts
const web3formsKey = import.meta.env.PUBLIC_WEB3FORMS_KEY as string | undefined;
const showForm = Boolean(web3formsKey);
const thankYouUrl = new URL("/thank-you", Astro.site ?? "https://essenly.beauty").toString();
```

- [ ] **Step 4: Update the form element**

Replace the opening `<form …>` tag and the honeypot input:

```astro
        <form class="contact-form" action="https://api.web3forms.com/submit" method="post">
          <input type="hidden" name="access_key" value={web3formsKey} />
          <input type="hidden" name="subject" value="New contact inquiry — Essenly" />
          <input type="hidden" name="from_name" value="Essenly Website" />
          <input type="hidden" name="redirect" value={thankYouUrl} />
          <input type="checkbox" name="botcheck" class="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true" />
```

Leave the rest of the form — `form-grid`, all fields, the submit button and the fine print — exactly as it is. This form keeps its own `category` select and does not get an `inquiry_type` radio.

- [ ] **Step 5: Run test to verify it passes**

Run: `PUBLIC_WEB3FORMS_KEY=test-key-000 npm run build && ./scripts/check-build.sh`
Expected: all Task 1-4 assertions PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/contact.astro scripts/check-build.sh
git commit -m "feat(contact): submit the contact form via Web3Forms

Same treatment as the wholesale form — shared key, shared /thank-you,
working botcheck honeypot."
```

---

### Task 5: Hero image

The file is already committed. This wires it up and stops `object-fit: cover` from beheading the model.

**Files:**
- Modify: `src/pages/wholesale.astro:65-72` (the `ImageAsset` call)
- Modify: `src/styles/global.css` (after the `.image-asset img` rule, around line 449)
- Test: `scripts/check-build.sh`

**Interfaces:**
- Consumes: `public/images/essenly/essenly-wholesale-hero.jpg` (1200×1373, already in the repo).
- Produces: the `.image-asset.hero-portrait` CSS hook, reusable by any future portrait slot.

- [ ] **Step 1: Write the failing test**

Append to `scripts/check-build.sh` before the final `exit $FAILED`:

```bash
echo "Task 5 — hero image"
assert_contains "$WHOLESALE" "/images/essenly/essenly-wholesale-hero.jpg" "hero src points at the jpg"
assert_contains "$WHOLESALE" "hero-portrait" "portrait class applied"
assert_absent "$WHOLESALE" "placeholder-stage" "hero renders an img, not a placeholder"
if [ -f "dist/images/essenly/essenly-wholesale-hero.jpg" ]; then
  echo "  PASS  hero asset copied to dist"
else
  echo "  FAIL  hero asset copied to dist"
  FAILED=1
fi
grep -q "hero-portrait" dist/_astro/*.css 2>/dev/null \
  && echo "  PASS  hero-portrait rule shipped in CSS" \
  || { echo "  FAIL  hero-portrait rule shipped in CSS"; FAILED=1; }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PUBLIC_WEB3FORMS_KEY=test-key-000 npm run build && ./scripts/check-build.sh`
Expected: Task 5 FAILs. `ImageAsset` still points at `essenly-wholesale-hero.png`, which no longer exists, so `existsSync` returns false and `PlaceholderAsset` renders — `placeholder-stage` is present and the `.jpg` path is not.

- [ ] **Step 3: Point the slot at the real file**

In `src/pages/wholesale.astro`, replace the `ImageAsset` call:

```astro
      <ImageAsset
        src="/images/essenly/essenly-wholesale-hero.jpg"
        class="hero-portrait"
        name="Wholesale hero"
        ratio="7:8"
        description="Model holding the product, premium beauty setting."
        notes="Avoid warehouse or bulk inventory imagery."
        alt="A model holding the Essenly RenewShell Intense Hydrating Hair Mask jar"
      />
```

The `ratio` prop is only consumed by `PlaceholderAsset`, so it changes to `7:8` purely so the placeholder matches the real image if the file ever goes missing. It does **not** control the rendered `<img>` — Step 4 does that.

- [ ] **Step 4: Stop cover from cropping the portrait**

In `src/styles/global.css`, add immediately after the `.image-asset img { … }` rule:

```css
.image-asset.hero-portrait {
  aspect-ratio: 1200 / 1373;
  min-height: 0;
}
```

This has to live in `global.css`. `ImageAsset` renders the `figure`, so a scoped rule inside `wholesale.astro` would never match it. Without this rule the figure keeps `min-height: 420px` and the img's `object-fit: cover` centre-crops a 1200×1373 portrait into a wide box, cutting the top of the model's head and the bottom of the jar.

- [ ] **Step 5: Run test to verify it passes**

Run: `PUBLIC_WEB3FORMS_KEY=test-key-000 npm run build && ./scripts/check-build.sh`
Expected: every assertion in the file PASSes.

- [ ] **Step 6: Check it with your eyes**

Run: `npm run preview`

Open `http://localhost:4321/wholesale` and confirm at three widths — a desktop window, ~800px, and ~380px — that the model's head and the full jar are both visible and the image is not squashed. A green grep is not proof the crop looks right.

- [ ] **Step 7: Commit**

```bash
git add src/pages/wholesale.astro src/styles/global.css scripts/check-build.sh
git commit -m "feat(wholesale): wire up the hero image

Points the slot at the cropped model shot and adds an explicit
aspect-ratio. ImageAsset's ratio prop only feeds the placeholder, so
without this rule global.css's object-fit: cover would crop the portrait
to the figure's 420px min-height and cut off the model and the jar."
```

---

### Task 6: Product name consistency

Added after Task 1's review. Task 1 changed `siteConfig.product.name` to the jar's real
name, but three files hardcode the old `"Essenly Keratin Hair Mask"` instead of reading the
field. `/product` currently renders the new name in its `<h1>` and spec table and the old
name in its `<title>` and body copy — one page, two product names. No original task covered
this.

**Files:**
- Modify: `src/data/siteConfig.ts` (add `product.shortName`)
- Modify: `src/layouts/Base.astro:14`
- Modify: `src/pages/index.astro:14,35,46,66,102,135,176`
- Modify: `src/pages/product.astro:21,44,76,82,168`
- Test: `scripts/check-build.sh`

**Interfaces:**
- Consumes: `siteConfig.product.name` = `"Essenly RenewShell™ Intense Hydrating Hair Mask"` (set in Task 1).
- Produces: `siteConfig.product.shortName` = `"Essenly Hair Mask"`.

#### Which name goes where

The canonical name is 46 characters. Dropped into seven `alt` attributes and body
sentences it reads like a spec sheet, so this task introduces a short form. `"Essenly Hair
Mask"` is what the company's own shipping paperwork calls the product, so it is not an
invention.

- **`product.name`** (canonical) — page `<title>`, `<h1>`, spec tables, meta descriptions.
  Anything a buyer or a search engine treats as the product's identity.
- **`product.shortName`** — flowing prose and `alt` text, where the full SKU would be noise.

Neither is hardcoded anywhere after this task. The old string must not survive.

- [ ] **Step 1: Write the failing test**

Append to `scripts/check-build.sh` before the final `exit $FAILED`:

```bash
echo "Task 6 — product name consistency"
for page in dist/index.html dist/product/index.html dist/wholesale/index.html dist/contact/index.html; do
  assert_absent "$page" "Keratin Hair Mask" "old product name absent from $page"
done
assert_contains "dist/product/index.html" "Essenly RenewShell" "product page carries the canonical name"
assert_contains "dist/product/index.html" "Essenly Hair Mask" "product page uses the short name in prose"
assert_contains "dist/index.html" "Essenly Hair Mask" "home page uses the short name in prose"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && ./scripts/check-build.sh`
Expected: the four `assert_absent` checks FAIL — `Keratin Hair Mask` is still hardcoded in
`Base.astro` (whose default description reaches every page that does not pass its own) and
in `index.astro` and `product.astro`. The `Essenly Hair Mask` assertions also FAIL, since
the short name does not exist yet.

- [ ] **Step 3: Add the short name**

In `src/data/siteConfig.ts`, add `shortName` directly beneath `name` in the `product` block:

```ts
    name: "Essenly RenewShell™ Intense Hydrating Hair Mask",
    shortName: "Essenly Hair Mask",
```

- [ ] **Step 4: Fix the layout default**

`src/layouts/Base.astro:14` hardcodes the old name in the fallback meta description. It
already imports `siteConfig`. Replace the default with a template literal using the
canonical name:

```ts
  description = `Discover ${siteConfig.product.name}, a sensorial Korean rinse-out treatment for softer, smoother and beautifully scented hair.`,
```

Destructuring defaults are evaluated per call, so referencing the imported `siteConfig`
here is fine.

- [ ] **Step 5: Fix the home page**

`src/pages/index.astro` already has `const product = siteConfig.product;` at line 7. Replace
each hardcoded occurrence:

| Line | Now | Becomes |
|---|---|---|
| 14 | `description="Discover Essenly Keratin Hair Mask, a sensorial Korean rinse-out treatment for softer, smoother and beautifully scented hair."` | `description={`Discover ${product.name}, a sensorial Korean rinse-out treatment for softer, smoother and beautifully scented hair.`}` |
| 35 | `alt="Essenly Keratin Hair Mask in warm editorial light"` | `alt={`${product.shortName} in warm editorial light`}` |
| 46 | `Essenly Keratin Hair Mask is a rich rinse-out treatment created for dry,` | `{product.shortName} is a rich rinse-out treatment created for dry,` |
| 66 | `alt="Essenly Keratin Hair Mask product and texture"` | `alt={`${product.shortName} product and texture`}` |
| 102 | `alt="A simple hair-care ritual with Essenly Keratin Hair Mask"` | `alt={`A simple hair-care ritual with ${product.shortName}`}` |
| 135 | `alt="Creamy texture of Essenly Keratin Hair Mask"` | `alt={`Creamy texture of ${product.shortName}`}` |
| 176 | `<p class="lead">Essenly Keratin Hair Mask is available to U.S. customers through Amazon.</p>` | `<p class="lead">{product.shortName} is available to U.S. customers through Amazon.</p>` |

- [ ] **Step 6: Fix the product page**

`src/pages/product.astro` already has `const product = siteConfig.product;` at line 6.

| Line | Now | Becomes |
|---|---|---|
| 21 | `title="Essenly Keratin Hair Mask \| Made in Korea"` | `title={`${product.name} \| Made in Korea`}` |
| 44 | `alt="Front view of Essenly Keratin Hair Mask"` | `alt={`Front view of ${product.shortName}`}` |
| 76 | `alt="Creamy texture of Essenly Keratin Hair Mask"` | `alt={`Creamy texture of ${product.shortName}`}` |
| 82 | `Essenly Keratin Hair Mask helps condition dry-looking hair and improve its overall` | `{product.shortName} helps condition dry-looking hair and improve its overall` |
| 168 | `<h2>Purchase Essenly Keratin Hair Mask through our U.S. Amazon listing.</h2>` | `<h2>Purchase {product.shortName} through our U.S. Amazon listing.</h2>` |

`Base.astro` appends `" | Essenly"` only when the title does not already contain
`"Essenly"`. The canonical name does, so line 21's title stays as written.

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run build && ./scripts/check-build.sh`
Expected: every assertion across Tasks 1-6 passes.

Then confirm nothing was missed — the build will not catch a leftover:

Run: `grep -rn "Keratin Hair Mask" src/`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/data/siteConfig.ts src/layouts/Base.astro src/pages/index.astro src/pages/product.astro scripts/check-build.sh
git commit -m "fix(content): one product name across the site

Task 1 renamed the product to match the jar label, but three files
hardcoded the old name, so /product rendered the new name in its h1 and
the old one in its title and body copy.

Adds product.shortName for prose and alt text — the canonical name is 46
characters and reads like a spec sheet mid-sentence. Canonical name keeps
titles, headings and spec tables."
```

---

## Done criteria

- [ ] `PUBLIC_WEB3FORMS_KEY=test-key-000 npm run build && ./scripts/check-build.sh` — every assertion passes.
- [ ] `npm run build && ./scripts/check-build.sh` — Task 3/4 form assertions fail (expected: no key means `mailto:` fallback), everything else passes.
- [ ] With a real key in `.env`, a submission from `/wholesale` arrives by email with `inquiry_type` visible in the body, and the browser lands on `/thank-you`.
- [ ] `/wholesale` shows no wholesale per-unit price anywhere. `$39.00` is the only dollar figure.

## Deliberately not in this plan

Reviews (`siteConfig.reviews`) and retail support assets (`siteConfig.supportAssets`) stay empty and their sections stay hidden — out of scope, and the Korean review asset states its quotes were reconstructed rather than quoted, so it cannot be used as verified testimony. `product.inci` and `product.cautions` stay `null`; the source data is a Korean ingredient list that needs translation first. The home and product pages keep their placeholders.
