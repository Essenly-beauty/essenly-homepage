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

export const siteConfig = {
  company: {
    legalName: "Essenly Co., Ltd.",
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
    name: "Essenly Keratin Hair Mask",
    type: "Rinse-out conditioning hair treatment",
    netWeight: null as string | null,
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
    msrp: null as string | null,
    openingMoq: null as string | null,
    standardMoq: null as string | null,
    volumeMoq: null as string | null,
    fulfillmentOrigin: null as string | null,
    paymentTerms: null as string | null,
    leadTime: null as string | null,
    returnTerms: null as string | null,
    samplesAvailable: true,
  },
  supportAssets: [] as WholesaleSupportAsset[],
} as const;

export const navItems = [
  { label: "Product", href: "/product" },
  { label: "About", href: "/#our-story" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Contact", href: "/contact" },
] as const;

export const getContactEmail = () =>
  siteConfig.contact.generalEmail ?? siteConfig.contact.wholesaleEmail ?? siteConfig.contact.pressEmail;

export const amazonUrl = siteConfig.links.amazonUs;
