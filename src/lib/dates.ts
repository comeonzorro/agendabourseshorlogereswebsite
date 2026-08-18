const MONTH_MAP: Record<string, number> = {
  janvier: 0, fevrier: 1, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, aout: 7, août: 7, septembre: 8, octobre: 9, novembre: 10,
  decembre: 11, décembre: 11,
};

export interface ParsedDate {
  startDate: Date;
  endDate: Date;
  startYMD: string;
  endYMD_excl: string;
}

function sanitize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toYMD(d: Date) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function monthIndex(name: string) {
  return MONTH_MAP[sanitize(name)];
}

function makeParsed(start: Date, endInclusive: Date): ParsedDate {
  const endExclusive = new Date(endInclusive);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return {
    startDate: start,
    endDate: endInclusive,
    startYMD: toYMD(start),
    endYMD_excl: toYMD(endExclusive),
  };
}

/** Parse les dates françaises de l'agenda (ex. « 20-23 février 2026 »). */
export function parseDateFR(txt: string): ParsedDate | null {
  const raw = txt.trim().replace(/[—–]/g, '-').replace(/\s+/g, ' ');
  const lower = raw.toLowerCase();

  // Plage même mois : « 20-23 février 2026 »
  let m = lower.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([a-zéûîôà]+)\s+(\d{4})$/i);
  if (m) {
    const mi = monthIndex(m[3]);
    if (mi == null) return null;
    const year = parseInt(m[4], 10);
    return makeParsed(new Date(year, mi, parseInt(m[1], 10)), new Date(year, mi, parseInt(m[2], 10)));
  }

  // Plage cross-mois : « 28 janvier - 1 février 2026 »
  m = lower.match(/^(\d{1,2})\s+([a-zéûîôà]+)\s*-\s*(\d{1,2})\s+([a-zéûîôà]+)\s+(\d{4})$/i);
  if (m) {
    const mi1 = monthIndex(m[2]);
    const mi2 = monthIndex(m[4]);
    if (mi1 == null || mi2 == null) return null;
    const year = parseInt(m[5], 10);
    return makeParsed(new Date(year, mi1, parseInt(m[1], 10)), new Date(year, mi2, parseInt(m[3], 10)));
  }

  // Date simple : « 18 janvier 2026 »
  m = lower.match(/^(\d{1,2})\s+([a-zéûîôà]+)\s+(\d{4})$/i);
  if (m) {
    const mi = monthIndex(m[2]);
    if (mi == null) return null;
    const year = parseInt(m[3], 10);
    const d = parseInt(m[1], 10);
    const start = new Date(year, mi, d);
    return makeParsed(start, start);
  }

  // Approximatif : « Fin août 2026 »
  m = lower.match(/^fin\s+([a-zéûîôà]+)\s+(\d{4})$/i);
  if (m) {
    const mi = monthIndex(m[1]);
    if (mi == null) return null;
    const year = parseInt(m[2], 10);
    const lastDay = new Date(year, mi + 1, 0).getDate();
    const end = new Date(year, mi, lastDay);
    return makeParsed(new Date(year, mi, 1), end);
  }

  return null;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isPastDate(endDate: Date, today = startOfToday()) {
  return endDate < today;
}

export function isPastDateText(txt: string, today = startOfToday()) {
  const parsed = parseDateFR(txt);
  if (!parsed) {
    const yearMatch = txt.match(/(\d{4})/);
    if (yearMatch) return parseInt(yearMatch[1], 10) < today.getFullYear();
    return false;
  }
  return isPastDate(parsed.endDate, today);
}

export function parseIsoDate(iso: string): Date {
  return new Date(iso);
}
