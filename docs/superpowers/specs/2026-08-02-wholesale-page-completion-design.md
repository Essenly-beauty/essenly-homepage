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

MOQ is 30, not 150. Landed cost per unit only falls from about $6.47 (1 case) to $5.87
(10 cases) — roughly 9%, or 3% of the wholesale price. That is not enough margin to
justify excluding the salons, head spas and boutiques the page explicitly targets, none of
which will commit to 150 units of a single SKU on a first order. Volume is driven by tier
pricing instead, and unserious buyers are filtered by qualification (business licence,
resale certificate, site review) plus a paid sample, not by a quantity wall.

Terms:

| Field | Value |
|---|---|
| `paymentTerms` | 100% prepayment on opening orders (wire or card); Net 30 considered after established order history |
| `leadTime` | 3-5 business days processing, then 2-5 business days in transit from Seoul |
| `fulfillmentOrigin` | Ships from Seoul, Korea |
| `returnTerms` | Damaged or defective units only, reported with photos within 7 days of delivery |
| `samplesAvailable` | `true` (unchanged) |
| Shipping | Ships DDP — Essenly pays customs and duties. Freight quoted by order size and destination |

### 3. Per-unit prices are not published

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
lost. Figures assume a 15% fuel surcharge, ~$130 fixed customs cost per shipment and
₩1,440/$, all of which need confirmation (see Open items).

| Tier | Units | Per unit | Off MSRP | Gross margin |
|---|---|---|---|---|
| Opening | 30 | $21.00 | 46% | 49% |
| Growth | 90 | $19.50 | 50% | 59% |
| Volume | 150 | $17.50 | 55% | 61% |
| Key account | 300 | $15.60 | 60% | 60% |

### 4. Images

Six English assets exist at `~/Downloads/880032497001.PT0*.png`, all 2000×2000 except PT05
at 1562×1562. In scope for this work is one of them:

| Source | Content | Destination |
|---|---|---|
| PT06 | Clean claims + jar splash | `essenly-wholesale-hero.png` |

PT06 is the wholesale hero: it shows the product in a premium setting, which is what the
slot's `notes` ask for, and its Paraben/Sulfate/Phthalate/Mineral-Oil-Free claims are
direct B2B selling points.

The asset is square but the slot declares `ratio="16:10"`. The slot ratio changes to `1:1`
rather than cropping, which would cut the jar.

The Korean assets (`상세2~8.png`, `메인1.png`) are not used — this is an English-language
US wholesale page.

#### Adjacent, not in scope

`index.astro` and `product.astro` reference five further slots that are also rendering
placeholders today: `essenly-product-hero`, `essenly-product-primary`, `essenly-hair-ritual`
and `essenly-product-texture` (home), plus `essenly-product-detail` and
`essenly-texture-macro` (product). Four of the remaining five assets map cleanly —
PT01→`product-texture`, PT02→`texture-macro`, PT03→`hair-ritual`, PT04→`product-detail`.

That leaves seven slots against six assets, and the two home slots that most need a plain
product shot (`product-hero`, `product-primary`) have no good candidate: PT05 is a
"How to use" instructional panel, not a hero image. Filling the home and product pages
therefore needs at least one asset that does not exist yet, and is a separate piece of work.

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
| `src/pages/wholesale.astro` | Web3Forms fields; tier table; glance/terms rows from `tiers`; hero ratio `1:1` |
| `src/pages/contact.astro` | Web3Forms fields (same treatment) |
| `src/pages/thank-you.astro` | New — shared post-submit page |
| `public/images/essenly/` | `essenly-wholesale-hero.png` from PT06 |
| `README.md` | Image list and `PUBLIC_WEB3FORMS_KEY` |

## Verification

`npm run build` must succeed. Then confirm on the built output:

1. "Wholesale terms" renders all rows; no row is silently dropped by a `null`.
2. "Product at a glance" shows 190ml and $39.00.
3. The tier table shows all four steps. No wholesale per-unit price appears anywhere on the
   page — the only dollar figure on `/wholesale` is the $39.00 MSRP.
4. With `PUBLIC_WEB3FORMS_KEY` set, both pages render the form; unset, both fall back to
   `mailto:` as they do today.
5. The hero renders `<img>`, not `PlaceholderAsset`.
6. A live submission arrives by email and the browser lands on `/thank-you`.

## Open items — none of which block this work

**Unit costs are provisional.** The shipping quote does not state whether the rates
(₩112,500 fixed for 1-3 boxes; ₩9,800-10,000/kg above) include the fuel surcharge, customs
brokerage is unpriced, and the duty rate is unconfirmed. HTS 3305 hair preparations are
normally duty-free and KORUS gives 0%, but the 2025 IEEPA reciprocal tariffs and Executive
Order 14389 (2026-02-20) leave this unsettled, and the US de minimis exemption ended in
2025, so even small direct shipments clear formally. Ask 프리즘: (1) is the fuel surcharge
included, (2) is customs clearance included or billed per shipment and at what rate, (3) is
DDP billing available. Because per-unit prices are never published, the page ships without
these answers; only the private rate card depends on them.

**DDP mechanism.** A foreign entity acting as US Importer of Record needs a customs bond
and a local agent. Use the courier's DDP billing option — the carrier fronts the duty and
bills Essenly — rather than registering as IOR.

**Fixed per-shipment customs cost cuts against small orders.** Under DDP those costs land on
Essenly, and at roughly $130 per entry that is $4.33/unit on a 30-unit order versus
$0.43/unit on 300. The tier ladder absorbs this: the entry tier is priced at a shallower
discount so margin stays in a 49-61% band across all four steps, and keystone (50% off
MSRP) begins at 90 units, giving buyers a clear reason to reach 3 cases.

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
