import type { Bourse, FocusPage } from './types';
import { parseDateFR } from './dates';
import { getAllFocusPages, getFocusPage } from './focus';

type SchemaObject = Record<string, unknown>;

const SITE = 'https://www.lagenda-des-bourses-horlogeres.com';
const DEFAULT_EVENT_IMAGE = `${SITE}/images/hero-bourse.jpg`;

/** Détails précis repris des anciennes pages HTML (schema.org/Event). */
const FOCUS_EVENT_OVERRIDES: Record<string, SchemaObject> = {
  blaye: {
    location: {
      '@type': 'Place',
      name: 'Couvent des Minimes',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'La Citadelle',
        addressLocality: 'Blaye',
        postalCode: '33390',
        addressRegion: 'Nouvelle-Aquitaine',
        addressCountry: 'FR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: "AFAHA — Délégation Grand Sud-Ouest",
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    description:
      "10ᵉ édition de la Bourse Horlogère de Blaye — ~30 exposants, entrée gratuite, dans le cadre historique de la Citadelle Vauban.",
  },
  besancon: {
    name: '12e Bourse Horlogère de Besançon — 24h du Temps',
    startDate: '2026-06-20T10:00:00+02:00',
    endDate: '2026-06-21T18:00:00+02:00',
    location: {
      '@type': 'Place',
      name: 'Kursaal',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Place du Casino',
        addressLocality: 'Besançon',
        postalCode: '25000',
        addressRegion: 'Bourgogne-Franche-Comté',
        addressCountry: 'FR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: "AFAHA — Association Française des Amateurs d'Horlogerie Ancienne",
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    description:
      "12ᵉ édition de la Bourse Horlogère de Besançon — ~40 exposants, entrée gratuite, dans le cadre des 24h du Temps.",
  },
  dourdan: {
    location: {
      '@type': 'Place',
      name: 'Salle des fêtes de Dourdan',
      address: {
        '@type': 'PostalAddress',
        streetAddress: "Rue d'Orsonville",
        addressLocality: 'Dourdan',
        postalCode: '91410',
        addressRegion: 'Île-de-France',
        addressCountry: 'FR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Lions Club de Dourdan',
    },
    offers: {
      '@type': 'Offer',
      price: '5',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    description:
      '10e édition : 50 exposants, environ 600 visiteurs sur 800 m². Partenariat AFAHA. Entrée 5 €. Restauration sur place.',
  },
  'saint-malo': {
    name: '2ᵉ Bourse Horlogère de Bretagne — Saint-Servan',
    startDate: '2026-10-04T10:00:00+02:00',
    endDate: '2026-10-04T18:00:00+02:00',
    location: {
      '@type': 'Place',
      name: 'Halles du marché',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Place Bouvet',
        addressLocality: 'Saint-Malo',
        postalCode: '35400',
        addressRegion: 'Bretagne',
        addressCountry: 'FR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Association Horlogère de Bretagne',
      url: 'https://association-horlogere-bretagne.com/',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
    description:
      'Entrée libre — ~40 exposants — Table ronde 15h — Concours/tombola 16h. Saint-Servan, Saint-Malo.',
  },
  amiens: {
    name: 'Bourse horlogère — Amiens',
    startDate: '2026-05-17T10:00:00+02:00',
    endDate: '2026-05-17T17:00:00+02:00',
    location: {
      '@type': 'Place',
      name: 'Amiens',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Amiens',
        addressRegion: 'Somme',
        addressCountry: 'FR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: "Association « Tout pour l'amateur de montres »",
    },
    description: "Bourse horlogère à Amiens — détails sur l'affiche officielle.",
  },
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function parisOffsetForMonth(monthIndex: number) {
  return monthIndex >= 3 && monthIndex <= 9 ? '+02:00' : '+01:00';
}

function toParisIso(date: Date, hour: number, minute = 0) {
  const offset = parisOffsetForMonth(date.getMonth());
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(hour)}:${pad2(minute)}:00${offset}`;
}

function icsUtcToIso(ics?: string) {
  if (!ics) return undefined;
  const m = ics.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}:00Z`;
}

function inferCountry(location: string) {
  if (/allemagne|munich|düsseldorf|furtwangen|eisenbach/i.test(location)) return 'DE';
  if (/pays-bas|houten|nederland/i.test(location)) return 'NL';
  if (/suisse|genève|geneve/i.test(location)) return 'CH';
  return 'FR';
}

function inferLocality(location: string) {
  return location.replace(/\s*\([^)]+\)\s*/g, '').trim();
}

function buildPlace(location: string, address: string): SchemaObject {
  const postal = address.match(/\b(\d{5})\b/);
  const country = inferCountry(location);
  return {
    '@type': 'Place',
    name: inferLocality(location),
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: inferLocality(location),
      ...(postal ? { postalCode: postal[1] } : {}),
      addressCountry: country,
    },
  };
}

function defaultPerformer(organizer?: SchemaObject): SchemaObject {
  if (organizer && typeof organizer === 'object' && organizer.name) {
    return {
      '@type': 'Organization',
      name: organizer.name as string,
      ...(organizer.url ? { url: organizer.url } : {}),
    };
  }
  return {
    '@type': 'Organization',
    name: 'Exposants de montres et horlogerie',
  };
}

function buildOffers(price: string | undefined, url: string, validFrom: string): SchemaObject {
  const offer: SchemaObject = {
    '@type': 'Offer',
    url,
    validFrom,
    availability: 'https://schema.org/InStock',
    priceCurrency: 'EUR',
  };

  if (!price || price === 'N/A') return offer;

  if (/gratuit|libre|free/i.test(price)) {
    offer.price = '0';
    return offer;
  }

  const match = price.match(/(\d+(?:[.,]\d+)?)/);
  if (match) offer.price = match[1].replace(',', '.');

  return offer;
}

function normalizeOffers(offers: SchemaObject, url: string, validFrom: string): SchemaObject {
  return {
    ...offers,
    url: (offers.url as string | undefined) ?? url,
    validFrom: (offers.validFrom as string | undefined) ?? validFrom,
  };
}

function priceFromPills(pills: string[]): string | undefined {
  return pills.find((pill) => /gratuit|libre|free|entrée|€/i.test(pill));
}

function enrichEventSchema(event: SchemaObject): SchemaObject {
  const url = event.url as string;
  const startDate = event.startDate as string;

  if (!event.image) event.image = [DEFAULT_EVENT_IMAGE];
  if (!event.performer) event.performer = defaultPerformer(event.organizer as SchemaObject | undefined);

  if (!event.offers) {
    event.offers = buildOffers(undefined, url, startDate);
  } else {
    event.offers = normalizeOffers(event.offers as SchemaObject, url, startDate);
  }

  return event;
}

function eventUrlForBourse(bourse: Bourse) {
  const href = bourse.website.href;
  if (bourse.website.internal || href.startsWith('/')) {
    return `${SITE}${href.startsWith('/') ? href : `/${href}`}`;
  }
  return href;
}

function eventNameForBourse(bourse: Bourse) {
  return `Bourse horlogère — ${bourse.location}`;
}

function baseEventFields(startDate: string, endDate: string): SchemaObject {
  return {
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    startDate,
    endDate,
  };
}

export function buildBourseEventSchema(bourse: Bourse, imageUrl?: string): SchemaObject | null {
  const parsed = parseDateFR(bourse.dates);
  if (!parsed) return null;

  const startDate = toParisIso(parsed.startDate, 10);
  const endDate = toParisIso(parsed.endDate, 17);
  const url = eventUrlForBourse(bourse);

  const event: SchemaObject = {
    '@type': 'Event',
    '@id': `${url}#event`,
    name: eventNameForBourse(bourse),
    ...baseEventFields(startDate, endDate),
    location: buildPlace(bourse.location, bourse.address),
    url,
    description: `${bourse.dates} — ${bourse.location}. ${bourse.address}`,
    offers: buildOffers(bourse.price, url, startDate),
  };

  if (imageUrl) event.image = [imageUrl];

  return enrichEventSchema(event);
}

function focusSlugFromHref(href: string) {
  const match = href.match(/^\/focus\/([^/?#]+)/);
  return match?.[1];
}

function normalizeCity(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function findFocusForBourse(bourse: Bourse): FocusPage | undefined {
  const href = bourse.website.href;
  if (bourse.website.internal || href.startsWith('/focus/')) {
    const slug = focusSlugFromHref(href);
    if (slug) return getFocusPage(slug);
  }

  const city = normalizeCity(inferLocality(bourse.location));
  return getAllFocusPages().find((page) => normalizeCity(page.city) === city);
}

export function buildFocusEventSchema(page: FocusPage): SchemaObject {
  const url = `${SITE}/focus/${page.slug}`;
  const image = page.seo.ogImage || page.poster;
  const absoluteImage = image ? `${SITE}${image.startsWith('/') ? image : `/${image}`}` : undefined;

  const startDate = page.countdown;
  const icsEnd = icsUtcToIso(page.ics?.dtEnd);
  const endDate = icsEnd || (page.countdown ? toParisIso(new Date(page.countdown), 17) : startDate);

  const base: SchemaObject = {
    '@type': 'Event',
    '@id': `${url}#event`,
    name: page.title,
    ...baseEventFields(startDate, endDate),
    startDate,
    endDate,
    location: page.ics?.location
      ? {
          '@type': 'Place',
          name: page.city,
          address: {
            '@type': 'PostalAddress',
            streetAddress: page.ics.location,
            addressLocality: page.city,
            addressCountry: 'FR',
          },
        }
      : buildPlace(page.city, page.subtitle),
    url,
    description: page.seo.description,
  };

  if (absoluteImage) base.image = [absoluteImage];

  const extras = page.structuredData ?? FOCUS_EVENT_OVERRIDES[page.slug];
  let event = base;

  if (extras) {
    event = {
      ...base,
      ...extras,
      url,
      startDate: (extras.startDate as string | undefined) ?? startDate,
      endDate: (extras.endDate as string | undefined) ?? endDate,
      ...(absoluteImage ? { image: [absoluteImage] } : {}),
    };
  }

  if (!event.offers) {
    const priceHint = priceFromPills(page.pills);
    if (priceHint) event.offers = buildOffers(priceHint, url, startDate);
  }

  return enrichEventSchema(event);
}

function buildUpcomingEventSchema(bourse: Bourse): SchemaObject | null {
  const focus = findFocusForBourse(bourse);
  if (focus) return buildFocusEventSchema(focus);
  return buildBourseEventSchema(bourse);
}

export function buildUpcomingEventsGraph(upcoming: Bourse[]) {
  const events = upcoming
    .map((bourse) => buildUpcomingEventSchema(bourse))
    .filter((event): event is SchemaObject => event != null);

  const itemListElement = events.map((event, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: event,
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: "L'agenda des bourses horlogères",
        url: `${SITE}/`,
        description: 'Agenda des bourses horlogères européennes — dates, lieux et infos pratiques.',
        inLanguage: 'fr-FR',
      },
      {
        '@type': 'ItemList',
        name: 'Prochaines bourses horlogères',
        description: 'Agenda des bourses horlogères européennes à venir.',
        numberOfItems: events.length,
        itemListElement,
      },
      ...events,
    ],
  };
}

export function buildFocusEventJsonLd(page: FocusPage) {
  return {
    '@context': 'https://schema.org',
    ...buildFocusEventSchema(page),
  };
}
