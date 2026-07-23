export const siteConfig = {
  amazonUrl: "https://a.co/d/0be8ancf",
  emails: {
    general: "To be confirmed",
    wholesale: "wholesale@essenly.beauty",
    press: "To be confirmed",
  },
  social: {
    instagram: "https://instagram.com/essenly.beauty",
  },
  company: {
    legalName: "Essenly Co., Ltd.",
    description:
      "A Seoul-based beauty company developing Korean beauty products and experiences for global customers.",
    address: "To be confirmed",
  },
  product: {
    name: "Essenly Keratin Hair Mask",
    fragrance: "Amber Vanilla",
    countryOfOrigin: "Made in Korea",
    netWeight: "To be confirmed",
    hairTypes: "Dry, frizzy and color-treated hair",
    msrp: "To be confirmed",
    openingOrder: "To be confirmed",
    wholesalePrice: "To be confirmed",
    standardMoq: "To be confirmed",
    casePack: "To be confirmed",
    leadTime: "To be confirmed",
    fulfillmentOrigin: "To be confirmed",
  },
  amazonProof: {
    rating: "TBD",
    reviewCount: "TBD",
    verifiedDate: "TBD",
  },
} as const;

export const navItems = [
  { label: "Product", href: "/product" },
  { label: "Our Story", href: "/#our-story" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Contact", href: "/contact" },
] as const;
