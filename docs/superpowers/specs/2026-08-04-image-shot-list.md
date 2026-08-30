# Landing image shot list — reference-matched, Essenly subject

**Date:** 2026-08-04
**Purpose:** produce an image set with the reference's compositions
(project-pef.com) but Essenly's subject: the peach RenewShell jar, hair-care
context, Amber Vanilla warmth. One brief per slot, usable as an AI-generation
prompt or a photography brief.

The reference's own files are **not** used — they are pef Inc.'s brand
photography. Their compositions, aspect ratios and palette are what we match.

## Global art direction

- Palette: warm cream `#f3ede6` grounds, peach product `#f2a68c`, amber-gold
  highlights. Nothing cool-toned except the brand-band backdrop.
- Light: single soft key, gentle falloff, no hard speculars except on water.
- The product is a **squat peach jar with a flat lid**, matte, wordmark
  "essenly." small on the body. Keep label area clean — real type gets
  composited later if needed; AI-baked lettering is the tell to avoid.
- No text, no captions, no borders baked into any image.
- Every file: at least the listed pixel size, JPEG or PNG, sRGB.

## Shots

| # | Slot | Size (min) | Composition |
| --- | --- | --- | --- |
| S1 | Hero + inline slot A | 2880x1470 | Model lying with cheek resting on her forearm, eyes to camera, damp glossy hair spread toward the right; the peach jar stands upright beside her face, left third. Warm cream seamless backdrop. Shallow depth, jar and eyes sharp. The inline slot is a crop of this same frame (continuity for the morph landing). |
| S2 | Inline slot B | 2150x1000 | Macro band of cream texture mid-swirl, warm ivory on peach, soft ridge shadows. Reads as a dark-to-light counterweight inside the headline. |
| S3 | Pictorial left | 948x1260 | Macro: two fingertips lifting a curl of the cream from the open jar, filaments stretching, warm backlight. Portrait 3:4. |
| S4 | Pictorial centre | 948x1260 | The jar mid-splash in shallow milky water, crown of droplets frozen, warm cream ground. Portrait 3:4. |
| S5 | Pictorial right | 948x1260 | Extreme macro of the cream surface, amber-lit swirls with tiny air bubbles, golden rim light. Portrait 3:4. |
| S6 | Brand band | 1920x980 | Neutral warm-gray studio backdrop. Model with damp side-swept hair holds the jar at her jawline, hand relaxed. Head-and-shoulders, generous negative space left for overlay type. |
| S7 | Product | 1400x2200 | The closed jar standing alone on an off-white surface, soft single shadow falling right, nothing else in frame. Portrait. |
| S8 | Accordion 01 — RenewShell | 1118x690 | 3D render: a translucent amber droplet resting on an overlapping-scale surface (hair cuticle reading, like roof tiles), warm glow where they meet. |
| S9 | Accordion 02 — Ingredients | 1118x690 | Still life: keratin powder, collagen gel sphere, raw shea butter, grouped on warm stone. |
| S10 | Accordion 03 — Made in Korea | 1118x690 | Clean lab bench, glass beakers of cream and amber liquid, soft daylight, no people, no signage. |
| S11 | Accordion 04 — How to use | 1118x690 | Wet mid-lengths of dark hair held between fingers with cream visibly worked through, shower-warm light. |
| S12 | Archive wide | 1644x960 | Editorial: model wrapped in a cream towel, laughing lightly, towel-dried hair, jar on the ledge beside her. |
| S13 | Archive tall | 760x960 | Keep the existing before/after strand comparison (evidence beats mood here) or reshoot to match warmth. |

## Placement map

| Shot | File it replaces / creates |
| --- | --- |
| S1 | `assets/source-photos/essenly-hero-model.jpg` → crops feed hero + `essenly-inline-a.jpg` |
| S2 | `essenly-inline-b.jpg` source |
| S3–S5 | `essenly-pictorial-{1,2,3}.jpg` |
| S6 | `essenly-band-wide.jpg` source (replaces the framed close-up crop) |
| S7 | `essenly-product-detail.jpg` (replaces marble + vanilla flowers scene) |
| S8–S11 | new — accordion panels get an image column (layout addition) |
| S12–S13 | `essenly-product-primary.jpg` / `essenly-archive-b.jpg` |

Drop originals in `assets/source-photos/`, run `npm run crops`
(windows get added per file), never put full-size sources in `public/`.
