# Essenly Beauty Website

Astro site for `essenly.beauty`, focused on Essenly Keratin Hair Mask, Amazon U.S. purchase flow and U.S. wholesale inquiry.

## Routes

- `/`
- `/product`
- `/wholesale`
- `/contact`
- `/privacy`
- `/terms`

## Commands

```sh
npm ci
npm run dev
npm run build
```

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

## Image Assets

Place final image files in `public/images/essenly/`.

- `essenly-logo-wordmark.svg`
- `essenly-product-hero.png`
- `essenly-product-primary.png`
- `essenly-product-detail.png`
- `essenly-product-texture.png`
- `essenly-texture-macro.png`
- `essenly-hair-ritual.png`
- `essenly-wholesale-hero.png`
