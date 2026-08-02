# Wholesale Page Completion — Design

Date: 2026-08-02
Repo: `Essenly-beauty/essenly-homepage` (Astro 6, static build, Vercel)
Branch: `feat/wholesale-completion`

## Problem

`/wholesale` has finished layout and copy but is starved of data and has no working
inquiry path. Concretely:

- Every `siteConfig.wholesale.*` field is `null`, so the "Wholesale terms" table renders
  5 of 10 rows and "Product at a glance" renders 7 of 10.
- `WHOLESALE_FORM_ENDPOINT` is unset, so the inquiry form is replaced by a `mailto:` button.
- `public/images/essenly/` holds only the logo SVG, so the hero renders a grey
  `PlaceholderAsset` box.

`contact.astro` shares the same form pattern and the same unset-endpoint fallback, so any
form decision applies to both pages.

## Scope

In scope: wholesale terms data, a working inquiry form, the wholesale hero image.

Out of scope: review quotes (`siteConfig.reviews`) and retail support assets
(`siteConfig.supportAssets`). Both stay empty; their sections stay hidden.

## Decisions

### 1. Form backend — Web3Forms

Free tier is 250 submissions/month against Formspree's 50, and this site has two forms
sharing one quota. The code-shape advantage of Formspree (its endpoint URL matches the
existing `action={endpoint}` structure) is worth about two lines; the quota difference is
5×.

Flow: buyer submits → Web3Forms emails the submission to the Essenly inbox → browser
redirects to `/thank-you`. No server runtime, no adapter; the site stays static.

Per-form changes (`wholesale.astro`, `contact.astro`):

| Change | Detail |
|---|---|
| `action` | Fixed `https://api.web3forms.com/submit` |
| Hidden `access_key` | From `PUBLIC_WEB3FORMS_KEY` |
| Hidden `redirect` | `https://essenly.beauty/thank-you` |
| Hidden `subject` | `New wholesale inquiry — Essenly` / `New contact inquiry — Essenly` |
| Honeypot | Rename `company_website` → `botcheck` |
| `showForm` | Condition on the key, not on the old endpoint var |
| `inquiry_type` | Wholesale form only — replaces the `sample_request` checkbox (see Sample programme) |

The honeypot rename matters: `company_website` is not a name Web3Forms recognises, so
today's honeypot filters nothing. `botcheck` is the field the service actually inspects.

`WHOLESALE_FORM_ENDPOINT` and `CONTACT_FORM_ENDPOINT` are removed in favour of the single
`PUBLIC_WEB3FORMS_KEY`. The `PUBLIC_` prefix is honest: in a static build the key is
inlined into the HTML regardless, and Web3Forms access keys are designed to be public.

New page: `src/pages/thank-you.astro`, shared by both forms.

### 2. Wholesale terms

Product facts:

| Field | Value |
|---|---|
| `product.name` | `Essenly RenewShell™ Intense Hydrating Hair Mask` |
| `product.netWeight` | `190ml` |
| `wholesale.msrp` | `$39.00` |

The product name is brand + SKU so it matches the jar label. The site previously said
"Essenly Keratin Hair Mask", which matches the Amazon listing title but not the printed
container — a mismatch that breaks reordering by SKU name.

Order tiers, aligned to the 30-unit case pack so no shipment ever splits a box:

| Tier | Units | Cases |
|---|---|---|
| Opening | 30 | 1 |
| Growth | 90 | 3 |
| Volume | 150 | 5 |
| Key account | 300 | 10 |

MOQ is 30, not 150. Landed cost per unit only falls from about $6.08 (1 case) to $5.56
(10 cases) — roughly 8%, or 2.7% of the wholesale price. That is not enough margin to
justify excluding the salons, head spas and boutiques the page explicitly targets, none of
which will commit to 150 units of a single SKU on a first order. Volume is driven by tier
pricing instead, and unserious buyers are filtered by qualification (business licence,
resale certificate, site review) plus a paid sample, not by a quantity wall.

Terms:

| Field | Value |
|---|---|
| `paymentTerms` | 100% prepayment on all orders (wire or card) |
| `leadTime` | 6-10 business days from payment: 3-5 to dispatch, 3-5 in transit from Seoul |
| `fulfillmentOrigin` | Ships from Seoul, Korea |
| `returnTerms` | Damaged or defective units only, reported with photos within 7 days of delivery |
| `samplesAvailable` | `true` (unchanged) — terms in Sample programme below |
| Shipping | Ships DDP — Essenly pays customs and duties. Freight quoted by order size and destination |

No Net 30 tier. At a $39 MSRP and a 30-unit opening case, even a key-account order is
around $4,700, which is not enough exposure to justify carrying receivables or running
credit checks on US accounts from Korea.

Lead time is stated as a total because two separate stages add up: 3-5 business days to get
stock into the forwarder after payment clears, then 3-5 business days in transit. Quoting
only the transit leg would understate delivery by about a week. The forwarder's own quote
says 2-5 days transit; 3-5 is used here because it matches observed performance and
under-promising is the safer default on a page buyers will hold you to.

### 3. Sample programme

Samples ship from US stock, not from Seoul: 2-3 business days instead of the 6-10 a
wholesale order takes. For a salon owner deciding whether to stock an unfamiliar Korean
brand, that turns a two-week evaluation into a three-day one, and it is a real advantage
over Korean competitors shipping samples internationally. The page states it explicitly.

The page says "ships from US stock" and does not name Amazon. A wholesale page that
advertises the brand's own Amazon fulfilment reminds retailers of the channel they are
competing with — see the couponing note under Open items.

Samples are paid at cost and credited against the buyer's first order. A fee filters out
consumers and tyre-kickers; crediting it removes the disincentive for a buyer who is
genuinely going to order. The fee itself is not published, for the same reason wholesale
prices are not: a sample priced near cost sits visibly below the $39 retail price on a page
consumers can find. It is quoted in the reply.

Page wording: `Samples are available to qualified buyers at cost, credited against your
first order. Ships from US stock, typically 2-3 business days.`

The hero already has a "Request a Sample" button, but it points at `#inquiry` — the same
target as "Request Wholesale Information" — so the page promises a sample path and delivers
the general form. The fix is a required radio as the first field of the inquiry form:

```
What are you looking for?   ( ) Wholesale pricing   ( ) Sample   ( ) Both
```

Field name `inquiry_type`, replacing the existing `sample_request` checkbox. Both hero
buttons still scroll to `#inquiry`; a short inline script preselects Sample when the sample
button is the one used. With JavaScript unavailable the form still works — the buyer picks
the radio themselves — so this stays progressive enhancement, not a dependency.

### 4. Per-unit prices are not published

Tier quantities go on the page; dollar figures do not. `/wholesale` is public and in the
sitemap, so a consumer who paid $39 on Amazon can find it. Printing "$15.60 at 300 units"
exposes the margin to that customer and hands competitors the cost structure. The existing
copy — "Wholesale price: Available upon qualified inquiry" — is already correct and stays.

Published wording: `Opening order from 30 units (one case). Volume pricing available at 90,
150 and 300 units.`

Quantities are published because they let a buyer self-select a tier before writing in,
which raises inquiry quality.

#### Private rate card — provisional

Not committed to code and not shown on the page; recorded here so the agreed shape is not
lost.

Landed cost is ₩4,800 COGS + ₩200 storage + freight, at ₩1,440/$. Freight comes straight
from the forwarder's quote, which is confirmed all-inclusive of the fuel surcharge. Customs
clearance is billed separately in arrears and is not yet priced; the margins below assume
$130 per shipment as a placeholder. Duty is unconfirmed and would add about $0.50/unit at
15%.

| Tier | Units | Landed | Per unit | Off MSRP | Gross margin |
|---|---|---|---|---|---|
| Opening | 30 | $10.41 | $21.00 | 46% | 50% |
| Growth | 90 | $7.52 | $19.50 | 50% | 61% |
| Volume | 150 | $6.45 | $17.50 | 55% | 63% |
| Key account | 300 | $5.99 | $15.60 | 60% | 62% |

Only the Opening row is sensitive to the customs placeholder, because the fee is
per-shipment: at $130 it costs $4.33/unit across 30 units but $0.43 across 300. If the real
fee lands at $200 the Opening tier falls to roughly 39% while the others barely move. Lock
the Opening price after the first shipment's clearance invoice arrives; $21.00 holds until
then.

### 5. Images

The hero is the model shot: `메인1.png` cropped to the photo card only, installed as
`public/images/essenly/essenly-wholesale-hero.jpg` (1200×1373, 405KB).

A hero's job on this page is to make a retailer believe their customers will want the
brand. A model holding the jar does that; PT06 — jar, splash, and a list of free-from
claims — reads as a spec panel and is better placed on the home or product page.

Crop and encoding, both already applied:

- `sips --cropOffset 500 0 -c 1373 1200` removes the Korean headline band at the top and
  the baked-in "RenewShell™ Intense Hydrating Hair Mask / Deep hydration. Frizz control.
  Silky shine." lockup at the bottom. That lockup matters: left in, it would sit beside the
  page's own H1 and give the hero two competing headlines.
- Re-encoded to JPEG q90. The cropped PNG was 2.4MB, which is not a defensible payload for
  an above-the-fold hero; the JPEG is 405KB for photographic content with no visible loss.
  The `src` in `wholesale.astro` therefore changes extension to `.jpg`.

#### The `ratio` prop does not do what the slot implies

`ImageAsset` passes `ratio` only to `PlaceholderAsset`. Once a real file exists the prop is
inert, and layout is governed by `global.css`: `.image-asset` has `min-height: 420px` and
`.image-asset img` is `width/height: 100%` with `object-fit: cover`.

So a 1200×1373 portrait dropped into a wide grid column will be center-cropped to the
figure's box — cutting the top of the model's head and the bottom of the jar. The fix is an
explicit aspect ratio on this one figure:

```css
/* global.css, beside .image-asset */
.image-asset.hero-portrait { aspect-ratio: 1200 / 1373; min-height: 0; }
```

passed through the component's existing `class` prop: `<ImageAsset class="hero-portrait" …>`.
It must live in `global.css`, not in `wholesale.astro`'s scoped block — the `figure` is
rendered inside `ImageAsset`, so a scoped selector in the page would not match it.

The `ratio` prop is still updated to `7:8` for accuracy, so the placeholder matches the real
image if the file is ever missing.

#### Korean assets — reviewed, mostly redundant

Text baked into a raster image cannot be translated in place; there is no layered source and
repainting typography over a photograph is not reliable. What is possible is cropping, when
the Korean sits in its own band, and retyping data as HTML.

| Asset | Content | Verdict |
|---|---|---|
| `메인1` | Model + jar | Cropped — now the wholesale hero |
| `상세2` | Jar + vanilla on marble | Croppable; Korean is confined to the top band |
| `상세3` | Before/after | Redundant — PT03 is the English version |
| `상세4` | RenewShell™ complex | Redundant — PT04 |
| `상세5` | Fragrance notes | Korean sits between English title and English note columns; not croppable. Belongs in HTML anyway |
| `상세6` | Reviews | Unusable — quotes are reconstructed, not verbatim |
| `상세7` | How to use | Redundant — PT05 |
| `상세8` | INCI + cautions | Data, not imagery — retype into `siteConfig` |

The short version: PT01-PT06 already *are* the English editions of most of this content, so
there is little to convert. The two genuinely useful leftovers — the fragrance note pyramid
and the INCI list — should become text in `siteConfig`, not images.

#### Adjacent, not in scope

`index.astro` and `product.astro` reference six further slots, all rendering placeholders
today. PT01→`product-texture`, PT02→`texture-macro`, PT03→`hair-ritual`, PT04→`product-detail`
map cleanly, and cropped `상세2` fills `product-hero` or `product-primary` — the gap that had
no candidate before, since PT05 is an instructional panel rather than a hero. Only one slot
would remain unfilled. This is a separate piece of work on separate pages.

## Data model change

`siteConfig.wholesale` currently stores MOQ as three loose strings (`openingMoq`,
`standardMoq`, `volumeMoq`), which cannot express a four-step ladder. Those three fields
are removed and replaced by:

```ts
tiers: [
  { label: "Opening", units: 30, cases: 1 },
  { label: "Growth", units: 90, cases: 3 },
  { label: "Volume", units: 150, cases: 5 },
  { label: "Key account", units: 300, cases: 10 },
]
```

`wholesale.astro` derives the "Opening order" glance row from `tiers[0]` and renders a tier
table in the "Wholesale terms" section. Changing the ladder later is a one-array edit, and
there is no second copy of the numbers to drift out of sync.

## Files

| File | Change |
|---|---|
| `src/data/siteConfig.ts` | Product name, net weight, MSRP, terms; replace three MOQ fields with `tiers` |
| `src/pages/wholesale.astro` | Web3Forms fields; `inquiry_type` radio; tier table; glance/terms rows from `tiers`; hero `src` → `.jpg`, `class="hero-portrait"`, `ratio="7:8"` |
| `src/pages/contact.astro` | Web3Forms fields (same treatment, no `inquiry_type`) |
| `src/pages/thank-you.astro` | New — shared post-submit page |
| `src/styles/global.css` | `.image-asset.hero-portrait` aspect-ratio rule |
| `public/images/essenly/` | `essenly-wholesale-hero.jpg` — done |
| `README.md` | Image list and `PUBLIC_WEB3FORMS_KEY` |

## Verification

`npm run build` must succeed. Then confirm on the built output:

1. "Wholesale terms" renders all rows; no row is silently dropped by a `null`.
2. "Product at a glance" shows 190ml and $39.00.
3. The tier table shows all four steps. No wholesale per-unit price appears anywhere on the
   page — the only dollar figure on `/wholesale` is the $39.00 MSRP.
4. With `PUBLIC_WEB3FORMS_KEY` set, both pages render the form; unset, both fall back to
   `mailto:` as they do today.
5. The hero renders `<img>`, not `PlaceholderAsset`, and the model's head and the jar are
   both fully visible at desktop, tablet and mobile widths — `object-fit: cover` crops a
   portrait aggressively if the `hero-portrait` rule is missed.
6. A live submission arrives by email and the browser lands on `/thank-you`.
7. `inquiry_type` is required and its value appears in the notification email, so wholesale
   and sample requests can be told apart without opening the message.
8. With JavaScript disabled, the "Request a Sample" button still reaches a usable form.

## Open items — none of which block this work

**Two of three cost questions are settled.** The forwarder's rates (₩112,500 fixed for 1-3
boxes; ₩9,800-10,000/kg above) are all-inclusive of the fuel surcharge, and Essenly absorbs
customs and duty under DDP. What remains open is the clearance fee, which is billed in
arrears and so will not be known until the first shipment clears, and the duty rate. HTS
3305 hair preparations are normally duty-free and KORUS gives 0%, but the 2025 IEEPA
reciprocal tariffs and Executive Order 14389 (2026-02-20) leave this unsettled, and the US
de minimis exemption ended in 2025, so even small direct shipments clear formally. Because
per-unit prices are never published, the page ships without these answers; only the private
rate card depends on them.

**DDP is affordable, but the exposure is concentrated.** Gross margin sits at 50-63% across
the ladder, so absorbing duty and clearance is comfortable in aggregate. The caveat is that
clearance is a per-shipment cost, so all of the uncertainty lands on the 30-unit tier — see
the rate card. Ten 30-unit orders carry ten clearance fees; one 300-unit order carries one.
This is an argument for watching the Opening tier's actual margin over the first few
shipments, not for raising the MOQ.

**DDP mechanism.** A foreign entity acting as US Importer of Record needs a customs bond
and a local agent. Use the courier's DDP billing option — the carrier fronts the duty and
bills Essenly — rather than registering as IOR.

**Amazon couponing caps the wholesale price.** MSRP is $39 but 15% coupons put the street
price near $33. A retailer buying at keystone competes against Essenly's own listing at a
41% margin, not 50% — the first objection any serious buyer will raise. A MAP policy and
reduced coupon depth are prerequisites for wholesale expansion. This is a commercial
decision, not a page change.

**Review quotes are rewritten, not verbatim.** The Korean review asset states the quotes
were reconstructed from Amazon reviews. `VerifiedReview.verified` must not be set `true`
for them. Reviews are out of scope here; this is a note for whoever fills them later.

**Assets available but unused.** The Korean detail images carry the full INCI list, the
cautions text, the RenewShell™ complex story and the fragrance note pyramid — enough to
fill `product.inci` and `product.cautions`, which are currently `null`. The INCI list needs
Korean-to-English conversion first, so it is left for a later pass.
