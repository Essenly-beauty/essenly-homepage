export type VerifiedReview = {
  id: string;
  quote: string;
  source: "Amazon";
  purpose: "home" | "wholesale";
  verified: boolean;
};

export type WholesaleSupportAsset = {
  label: string;
  available: boolean;
};

export type WholesaleTier = {
  label: string;
  units: number;
  cases: number;
};

export const siteConfig = {
  company: {
    legalName: "Essenly Inc.",
    city: "Seoul",
    country: "Republic of Korea",
    businessAddress: null as string | null,
    description:
      "A Seoul-based beauty company creating Korean beauty products and sensorial experiences for global customers.",
  },
  contact: {
    generalEmail: null as string | null,
    wholesaleEmail: "wholesale@essenly.beauty",
    pressEmail: null as string | null,
  },
  links: {
    amazonUs: "https://a.co/d/06pH7fTx",
    instagram: "https://instagram.com/essenly.beauty",
  },
  product: {
    name: "Essenly RenewShell™ Intense Hydrating Hair Mask",
    shortName: "Essenly Hair Mask",
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
  amazon: {
    rating: "4.7",
    ratingCount: "33",
    checkedAt: null as string | null,
  },
  reviews: [] as VerifiedReview[],
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
    sampleTerms:
      "Available to qualified buyers at cost, credited against your first order. Ships from U.S. stock, typically 2-3 business days.",
    // Marketing support costs real money, so it is tied to order volume.
    // Keep this equal to one of the tier `units` values above.
    supportFromUnits: 90,
  },
  supportAssets: [
    { label: "Product photography and marketing creatives", available: true },
    { label: "Joint promotions and in-store events", available: true },
    { label: "Gift-with-purchase stock for campaigns", available: true },
    { label: "Product copy and ingredient detail for listings", available: true },
  ] as WholesaleSupportAsset[],
} as const;

/* Anchors on the one-page landing. /product, /wholesale and /contact still
   resolve — astro.config.mjs redirects them here — but nothing should link
   through a redirect when the destination is known. */
export const navItems = [
  { label: "Product", href: "/#product" },
  { label: "Science", href: "/#science" },
  { label: "Wholesale", href: "/#wholesale" },
  { label: "Contact", href: "/#contact" },
] as const;

export const getContactEmail = () =>
  siteConfig.contact.generalEmail ?? siteConfig.contact.wholesaleEmail ?? siteConfig.contact.pressEmail;

export const amazonUrl = siteConfig.links.amazonUs;

// Single source of truth for the production origin. astro.config.mjs sets the
// same value as its `site` option; Astro.site is preferred where available
// (each .astro page falls back to this constant), but the Web3Forms redirect
// target does not vary per page, so it is derived here once instead of being
// rebuilt inline at every call site.
export const siteUrl = "https://essenly.beauty";
export const thankYouUrl = new URL("/thank-you", siteUrl).toString();
