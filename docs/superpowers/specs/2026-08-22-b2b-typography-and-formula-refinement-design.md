# Essenly B2B Typography and Formula Refinement — Design

**Date:** 2026-08-22  
**Target:** the preserved B2B visual prototype at `.superpowers/brainstorm/17283-1786962059/`  
**Audience:** U.S. salons, head spas, independent beauty retailers and other care shops assessing an Essenly wholesale partnership.

## Goal

Refine the existing product-led B2B homepage before expanding its scope. The result should feel like quiet, premium Korean hair care: precise enough for a buyer to assess, but warm enough to convey a sensorial retail ritual.

The first pass changes only the header, the page-wide type and spacing system, and the Formula at a glance section. The existing product, partnership, terms and inquiry content remains in place.

## Problems to solve

- The current Georgia/Arial pairing is a rough prototype rather than a deliberate hierarchy.
- Display, section and ingredient type are too close in visual weight, while the small supporting text becomes faint.
- Each formula item is `50vh` tall and inactive rows fall to 24% opacity. This creates blank scrolling space and hides information that buyers should be able to scan.
- The formula illustrations are oversized, inconsistent in emphasis and detached from the copy.
- The header wordmark is uppercase, has no emblem, and does not establish Essenly as a recognisable brand at the first scroll position.

## Visual direction

The palette stays warm and restrained: cream paper, ink brown, muted sage and a restrained peach highlight. Strong colour is not used as decoration.

Use one editorial display serif for brand and headings and one readable humanist sans for labels, form controls and body copy. The final website will self-host the selected fonts; the prototype may use a safe fallback pair until font assets are supplied. No more than two families or four weights are used.

## Header

- Replace `ESSENLY` with the lowercase wordmark `essenly`.
- Add a 20–22px inline RenewShell symbol immediately to its left: three nested open arcs drawn as a single thin-line mark, with a small filled point at the inner arc. It recalls a protected hair cuticle rather than a generic leaf, droplet or monogram.
- Keep the header at 72px desktop and 64px mobile. The shell uses a max width of 1,200px.
- Keep only one utility label, `Trade partners`, plus the `Wholesale inquiry` text link. The header must not become a dense navigation bar.
- On scroll, use a solid cream field and a 1px warm border. No frosted glass effect or large shadow.

## Typography system

| Role | Desktop size / line-height | Mobile | Usage |
| --- | --- | --- | --- |
| Eyebrow | 0.6875rem / 1.2, tracking 0.12em | unchanged | Section context only |
| Body | 1rem / 1.6 | unchanged | Description and long-form copy, max 42ch |
| Supporting title | 1.75–2rem / 1.12 | 1.5rem / 1.16 | Cards, terms, form heading |
| Ingredient title | clamp(2.5rem, 3.2vw, 2.75rem) / 1.0 | 2rem / 1.04 | Keratin, Collagen, Shea Butter |
| Section title | clamp(3rem, 4vw, 3.5rem) / 1.02 | 2.5rem / 1.06 | Product, Formula, partnership headings |
| Hero title | clamp(4.25rem, 5.5vw, 4.75rem) / 0.98 | 3rem / 1.0 | Hero only |

Heading letter spacing is tight but readable, between -0.02em and -0.035em. Small uppercase labels retain wide tracking. Body text stays at 16px or above and uses ink-tinted text rather than low-opacity gray.

## Spacing system

Use the following scale consistently: 8, 12, 20, 32, 48, 56, 80 and 120px. Related text stacks use 12–20px; distinct content groups use 48–80px. Section padding is 120px desktop and 76px mobile.

## Formula at a glance

The section becomes a clear buyer-facing reference instead of a scroll choreography.

1. A non-sticky heading block contains the eyebrow, `What makes the ritual feel considered.`, and a one-paragraph explanation. It is separated from the first ingredient by 56px.
2. All three ingredient rows remain fully visible. Do not lower non-active rows below normal text contrast. A small active-number treatment may change on scroll, but opacity and the ability to scan never change.
3. Each desktop row is 220–240px high with a 1px top divider and a four-part grid: `48px number | 132px illustration | minmax(0, 1fr) copy`.
4. The illustration is a transparent 120–132px line drawing rather than a large card. It has a visually stronger ink line with sage and peach only as accents.
5. Keratin uses parallel hair-fibre curves; Collagen uses a connected chain; Shea Butter uses a seed plus an oil curve. Each illustration communicates one idea and is labelled for assistive technology.
6. Ingredient copy has a 40–44px title, a 13px gap, and a 16px/1.6 description limited to 38ch.
7. On mobile, each row becomes `number + title` followed by a 96px illustration and description. Rows are content-height, never viewport-height.

## Interaction and accessibility

- Keep only opacity/transform entrance transitions and respect `prefers-reduced-motion`.
- Formula rows start readable with JavaScript disabled and remain readable after any animation failure.
- Retain semantic `article`, `figure`, heading and accessible illustration labels.
- Maintain at least 4.5:1 contrast for all copy on the cream field.

## Verification

- Review at 1440px, 768px and 390px widths.
- Confirm that the whole Formula section can be understood without scrolling a single item into an active state.
- Confirm no horizontal overflow, text truncation or overlap in the header or formula rows.
- Confirm `essenly` and the RenewShell mark remain legible at 200% browser zoom.
- Confirm the existing inquiry choice controls and page links still work.

## Out of scope

- Changing wholesale data, fulfilment promises, sample policy or the inquiry backend.
- Publishing per-unit wholesale prices or unverified marketplace ratings.
- Replacing product photography or adding new ingredient photography.
- Rebuilding the rest of the homepage in this first refinement pass.
