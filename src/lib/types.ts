export interface FocusCta {
  label: string;
  href: string;
  style?: 'primary' | 'secondary' | 'ghost';
  id?: string;
}

export interface FocusCard {
  title: string;
  badge?: string;
  description: string;
  bullets?: string[];
  cta?: FocusCta;
}

export interface FocusFaq {
  question: string;
  answer: string;
}

export interface FocusGalleryItem {
  src: string;
  alt: string;
  title: string;
  note?: string;
}

export interface FocusProduct {
  src: string;
  alt: string;
  title: string;
  price?: string;
  note?: string;
  links: FocusCta[];
}

export interface FocusPage {
  slug: string;
  city: string;
  year: string;
  gridDate: string;
  title: string;
  subtitle: string;
  countdown: string;
  poster: string;
  posterAlt: string;
  pills: string[];
  ctas: FocusCta[];
  cards: FocusCard[];
  faq: FocusFaq[];
  footer: string;
  seo: {
    title: string;
    description: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
  theme?: { timerBg?: string };
  ics?: {
    summary: string;
    location: string;
    description: string;
    dtStart: string;
    dtEnd: string;
    filename: string;
    uid: string;
  };
  gallery?: { title: string; note?: string; items: FocusGalleryItem[] };
  shop?: { title: string; note?: string; items: FocusProduct[] };
  leadForm?: {
    title: string;
    description: string;
    bullets?: string[];
    formspree?: string;
    note?: string;
  };
  dock?: { items: FocusCta[] };
  structuredData?: Record<string, unknown>;
}

export interface Bourse {
  dates: string;
  location: string;
  address: string;
  contact: string;
  price: string;
  website: {
    label: string;
    href: string;
    internal?: boolean;
  };
}
