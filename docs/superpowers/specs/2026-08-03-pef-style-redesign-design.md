# Essenly homepage — pef-style one-page redesign

**Date:** 2026-08-03
**Branch:** `feat/pef-style-redesign`
**Reference:** https://www.project-pef.com/ (the "Vylumn" landing by pef Inc.)

## Goal

Replace the current 7-page Essenly site with a single scroll-driven landing page
that reproduces the reference's layout and motion, carrying Essenly's own
product, copy and peach accent.

## Decisions

These were settled with the user before any code was written. They are fixed
inputs to the build, not open questions.

| Decision | Choice |
| --- | --- |
| Page architecture | One-page landing; `/product`, `/wholesale`, `/contact` become redirects. `/privacy`, `/terms`, `/thank-you` stay real pages. |
| Primary audience | B2C brand-first. Amazon is the primary CTA; wholesale is one section plus a form tab. |
| Motion fidelity | Full reproduction, including the hero-to-headline morph. |
| Language | English only. No Korean sublines, no i18n routing. |
| Colour | Reference's neutral structure; amber `#FFAE00` replaced by Essenly clay `#c47662`. |
| Wordmark | Existing SVG, with the shrink-on-scroll treatment. |
| Photography | Zero new shoots. The 7 existing images are cropped and reused. |
| Accordion content | Four rows drafted from existing `product.astro` copy. |
| Buy link | Amazon U.S. only — no multi-store icon row. |
| Form tabs | Product / Wholesale / Other, on the existing Web3Forms backend. |
| Type scale | vw-based rem, matching the reference — chosen over `clamp()` against the recommendation. See "Accepted tradeoff". |
| Build order | (1) static layout at `/preview`, (2) motion, (3) promote to `index.astro`. Reviewed between steps. |

## How the reference actually works

Worth recording, because the layout is inseparable from the scroll choreography.

**Stack.** Static HTML, jQuery, Swiper, AOS, GSAP 3.11.3 (ScrollTrigger,
ScrollToPlugin), Lenis 1.1.18 for smooth scroll. Fonts are Inter for English and
Noto Sans KR for Korean. Total page height is roughly 9000px at a 1440px viewport.

**The rem trick.** `html { font-size: 0.05208333178113vw }`, which is
`100/1920 vw` — so `1rem` is 1/1920th of the viewport width and every value in
the stylesheet is effectively a fraction of screen width. Below 1280px it
switches to `html { font-size: 1px }`, making rem behave as px. This is why the
desktop layout holds identical proportions at any width.

Reference values, and what they resolve to at a 1440px viewport:

| Token | Reference | At 1440px |
| --- | --- | --- |
| Headline (`.info_wrap p`) | `110rem`, weight 600, line-height 115%, tracking -0.02em | ~82px |
| Section headline (philosophy) | `60rem`, weight 500, tracking -0.03em | ~45px |
| Eyebrow | `16rem`, weight 500, tracking +0.02em, uppercase | ~12px |
| Hero card at rest | `1258 x 642rem` | ~943 x 481px |
| Inline morph slot | `215 x 100rem` | ~161 x 75px |
| Locked header height | `70rem` | ~53px |
| Header padding | `0 40rem 0 80rem` | ~30px / 60px |

**Palette.** `#101010` near-black, `#FFFFFF`, `#F6F5F3` warm off-white,
`#FFAE00` amber accent, `#575758` gray body, `#E9E9E9` hairline. Radius is 0
throughout.

**The three hero ScrollTriggers.** This is the signature move and the riskiest
part of the build.

1. `heroSt` — trigger `.hero_scroll_track`, `top bottom` → `bottom top`, scrubbed.
   Drives `applyHeroScroll`. `.hero_bg` is `position: fixed` and grows from the
   `1258x642rem` card to fullscreen over `--hero-expand-scroll: 480px`, then
   holds for `--hero-hold-scroll: 65vh`.
2. `morphSt` — trigger `.info_section`, `top bottom` → `top top`, scrubbed.
   Drives `applyHeroMorph`, which measures the destination inline slot inside the
   headline and animates the fixed hero into it (width, height, position). On
   completion `.hero_bg` gets `.is-hero-morphed` (`visibility: hidden`) and the
   real inline `<img>` gets `.is-hero-morph-revealed`.
3. `infoSt` — drives `applyInfoMorph` for the second inline slot.

The scroll track's height is
`calc(var(--hero-expand-scroll) + var(--hero-hold-scroll) + var(--hero-morph-scroll))`
with `margin-top: 100vh`, which is what reserves the scroll distance the pinned
hero consumes. `onLeaveBack` re-measures and reverses cleanly, so scrolling up
restores the fullscreen state rather than snapping.

Mobile (`<1280px`) is a **separate implementation** — `landing-mobile.js`,
`#mobile-home`, `.mobile_hero_section` — with its own intro that boots
fullscreen and settles, plus scroll gating. The desktop morph does not run.

**The rise pattern.** Every section reveals with the same two-element structure:
an outer `.X_rise_item` that clips, and an inner `.X_rise_inner` that translates
on Y with opacity and `will-change: transform, opacity`. Items stagger, and
reverse on scroll-up.

**Two details worth copying.** The philosophy section's lines start at
`rgba(255,255,255,0.30)` and each gets `.is-lit` → `#FFFFFF` with a
`color 0.35s ease` transition as it scrolls into place, so the paragraph lights
up line by line. The science accordion animates
`height 0.5s cubic-bezier(0.4,0,0.2,1)` with opacity, one panel open at a time.

## Section plan

Eleven sections, mapped to Essenly content and existing image files.

| # | Section | Reference source | Essenly content | Background | Image |
| --- | --- | --- | --- | --- | --- |
| 1 | Header | `#landing_header` | Wordmark, nav (Product / Science / Wholesale / Contact), "Shop on Amazon →" | `#FFFFFF` | wordmark SVG |
| 2 | Hero | `.hero_section` | No copy — the image is the hero | `#FFFFFF` | `essenly-hair-ritual` |
| 3 | Info headline | `.info_section` | "Hair Care ▢ That Stays / With You ▢ Long After" + eyebrow + lead | `#F6F5F3` | 2 inline crops: `product-hero`, `texture-macro` |
| 4 | Pictorial | `.pictorial_section` | 3-up full-bleed row | image | `product-texture`, `product-hero`, `texture-macro` |
| 5 | Philosophy | `#philosophy` | 4 line-lit lines on the conditioning story + "Shop on Amazon →" | `#101010` | — |
| 6 | Brand band | `.vylumn_section` | "essenly." + "RenewShell™ Technology" top-left; "5 min" + caption bottom-left | image | `essenly-hair-ritual` wide crop |
| 7 | Product | `#serum` | Centred headline, product shot, spec rows (Volume 190ml / MSRP $39.00 / Origin Made in Korea), "Shop on Amazon →" | `#F6F5F3` | `product-detail` |
| 8 | Science | `#science` | Headline + 4-row accordion | `#FFFFFF` | reuse in open panels |
| 9 | Archive | `.archive_section` | Title + 2 images | `#FFFFFF` | `wholesale-hero`, `product-primary` |
| 10 | Wholesale | new, reference-styled | MSRP, 4 tiers, payment / lead time / samples | `#101010` | — |
| 11 | Contact + footer | `#reserve`, `#landing_footer` | Tabbed form, Amazon link, company block | `#FFFFFF`, `#101010` | — |

### Accordion rows (section 8)

Drafted from `product.astro`. Content for review, not final copy.

| # | Label | Kicker |
| --- | --- | --- |
| 01 | RenewShell™ Technology | How it works |
| 02 | Key Ingredients | What is inside |
| 03 | Made in Korea | Where it comes from |
| 04 | How to Use | The five-minute ritual |

### Wholesale section (section 10)

Everything comes from `siteConfig.wholesale`, so the numbers stay in one place:
MSRP `$39.00`; tiers Opening 30 / Growth 90 / Volume 150 / Key account 300 units;
100% prepayment; 6–10 business days lead time; samples at cost credited against
the first order. Marketing support is gated at 90 units — that gate already
exists in `siteConfig` and must not be hardcoded into markup.

## Architecture

Two rules shape the file layout: the page is long, and the motion is the risky
part. So sections become separate components, and all motion lives in one place
where it can be reasoned about and disabled as a unit.

```
src/
  layouts/
    Landing.astro          new — no top-note, no old header/footer
  components/
    landing/
      Header.astro         nav + shrinking wordmark
      Hero.astro           .hero_scroll_track + fixed .hero_bg
      InfoHeadline.astro   headline with inline morph slots
      Pictorial.astro      3-up image row
      Philosophy.astro     black band, line-lit paragraph
      BrandBand.astro      full-bleed portrait + overlay
      Product.astro        product shot + spec rows
      Science.astro        accordion
      Archive.astro        2-image band
      Wholesale.astro      black band, tiers + terms
      Contact.astro        tabbed Web3Forms form
      Footer.astro
      Rise.astro           the rise_item / rise_inner wrapper
  scripts/
    landing-motion.ts      Lenis + all ScrollTriggers
    landing-accordion.ts   accordion, no GSAP dependency
    landing-tabs.ts        form tabs, no GSAP dependency
  styles/
    landing.css            vw rem base + section styles
  pages/
    preview.astro          steps 1-2 live here
    index.astro            step 3 promotes preview into this
```

`Rise.astro` exists so the clip/translate pair is declared once rather than
repeated in eleven components. Accordion and tabs are deliberately independent
of GSAP — they must keep working if the motion layer fails to load.

`landing-motion.ts` owns every ScrollTrigger and the Lenis instance, and exports
a single `initLandingMotion()`. It is the only file that needs to know about
`--hero-expand-scroll` and friends. It no-ops under
`prefers-reduced-motion: reduce` and below the 1280px desktop breakpoint, which
is also where the reference switches to its separate mobile path.

### Dependencies

GSAP and Lenis get installed as npm packages rather than pulled from a CDN — the
reference's CDN `<script>` tags would cost extra round trips and leave the site
dependent on cdnjs uptime.

```
npm i gsap lenis
```

### Redirects

Added to `astro.config.mjs` so the three absorbed pages keep working. The key is
`redirects`, top-level, and on a static build Astro emits an HTML redirect file
per entry:

```js
redirects: {
  '/product': '/#product',
  '/wholesale': '/#wholesale',
  '/contact': '/#contact',
}
```

The old `product.astro`, `wholesale.astro` and `contact.astro` must be deleted in
the same step — a real page at `/product` wins over a redirect for that path.

The sitemap filter must also drop `/preview` once it exists, alongside the
existing `/thank-you` exclusion.

## Type scale

Matching the reference: `html { font-size: 0.05208333vw }` at ≥1280px,
`html { font-size: 1px }` below. All section values are then authored in `rem` as
1/1920ths of viewport width, so the reference's numbers transfer directly.

### Accepted tradeoff

This breaks WCAG 1.4.4. A vw-derived root font-size ignores the reader's browser
font-size preference, and because page zoom shrinks the CSS viewport width, zoom
largely cancels itself out. The user chose this knowingly, for pixel-identical
scaling.

Mitigation, which preserves the intent: clamp the root font-size so it stops
scaling at extreme widths rather than growing without limit.

```css
html { font-size: clamp(0.66px, 0.05208333vw, 1.33px); }
```

At 1280–2560px this is identical to the reference. Below and above that range it
holds instead of degenerating. Body copy also gets an absolute `px` floor so no
text can resolve below 14px.

## States

| State | Treatment |
| --- | --- |
| Loading | Hero image is `loading="eager"` + `fetchpriority="high"`. Everything below the fold is lazy. No spinner — the hero is the first paint. |
| Empty | `siteConfig.reviews` is `[]` today, so the review block renders nothing rather than an empty shell. Same guard for `amazon.rating`, which the current `index.astro` already handles. |
| Error | If `PUBLIC_WEB3FORMS_KEY` is absent the form is replaced by the existing mailto panel. Form errors render inline with `aria-invalid`, not `alert()`. |
| Success | Submit redirects to `/thank-you` (existing `thankYouUrl`). |
| No JS | Sections render static and readable. The accordion uses `<details>` semantics so it opens without JS. |
| Reduced motion | `initLandingMotion()` returns early; the hero renders inline at its final size rather than fixed. |

## Testing

The `tests/` directory does not exist in this repo yet, so this starts it.

- **Build.** `npm run build` must pass, and the redirect config must emit the
  three redirect pages.
- **Motion, manual.** Scroll down through the hero and back up. The reverse path
  is where the reference's `onLeaveBack` logic matters and where a naive
  implementation breaks. Check at 1280px, 1440px and 2560px.
- **Motion, automated.** Screenshot the page at fixed scroll offsets via the
  browse tool and compare against the reference captures already in the
  scratchpad. Exact pixel equality is not the bar; section order, proportion and
  colour are.
- **Accordion and tabs.** Keyboard-operable, one panel open at a time, focus
  visible.
- **Reduced motion.** With the preference set, the page must be fully readable
  and scrollable with no fixed-position artifacts.
- **Redirects.** `/product`, `/wholesale`, `/contact` all land on the right
  anchor.

## Out of scope

Not part of this redesign, recorded so they do not creep in:

- New photography, and the archive section's ideal 2 bespoke images.
- Korean copy or i18n routing.
- Any change to the Web3Forms backend or to `siteConfig` values.
- The reference's Swiper carousel and reCAPTCHA — neither is needed here.
- Multi-store buy links.
