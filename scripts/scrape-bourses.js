/**
 * Met à jour src/data/bourses.json depuis les sources officielles connues.
 * Usage : npm run update-agenda
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/data/bourses.json');

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'agenda-bourses-horlogeres-updater/1.0' },
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#8211;|&amp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRange(startDay, endDay, monthIndex, year) {
  const month = MONTHS_FR[monthIndex];
  if (startDay === endDay) return `${startDay} ${month} ${year}`;
  return `${startDay}-${endDay} ${month} ${year}`;
}


async function scrapeAntikUhrenboerse() {
  const html = await fetchText('https://www.antik-uhrenboerse.eu/');
  const text = stripHtml(html);
  const m = text.match(/(\d{1,2})\.\s*[–-]\s*(\d{1,2})\.\s*August\s*(\d{4})/i);
  if (!m) return null;
  return {
    locationIncludes: 'Furtwangen',
    dates: formatRange(parseInt(m[1], 10), parseInt(m[2], 10), 7, parseInt(m[3], 10)),
    source: 'antik-uhrenboerse.eu',
  };
}

async function scrapeMunichWatchFair() {
  const html = await fetchText('https://www.munichwatchfair.com/termine');
  const text = stripHtml(html);
  const dates = [...text.matchAll(/(\d{1,2})\.\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})/gi)]
    .map((m) => {
      const deMonths = {
        januar: 0, februar: 1, märz: 2, april: 3, mai: 4, juni: 5,
        juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11,
      };
      const mi = deMonths[m[2].toLowerCase()];
      if (mi == null) return null;
      return formatRange(parseInt(m[1], 10), parseInt(m[1], 10), mi, parseInt(m[3], 10));
    })
    .filter(Boolean);

  return {
    locationIncludes: 'Munich (Allemagne)',
    expectedDates: [...new Set(dates)],
    source: 'munichwatchfair.com',
  };
}

async function scrapeRikketik() {
  const html = await fetchText('https://rikketik.nl/beursinformatie/');
  const text = stripHtml(html);
  const yearBlocks = [...text.matchAll(/(\d{4})\s+zondag\s+(\d{1,2})\s+(\w+)/gi)];
  const byYear = {};
  for (const [, year, day, monthNl] of yearBlocks) {
    const nlMonths = {
      januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
      juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11,
    };
    const mi = nlMonths[monthNl.toLowerCase()];
    if (mi == null) continue;
    byYear[year] ??= [];
    byYear[year].push(formatRange(parseInt(day, 10), parseInt(day, 10), mi, parseInt(year, 10)));
  }
  return { byYear, source: 'rikketik.nl' };
}

async function scrapeLes24hDuTemps() {
  const html = await fetchText('https://www.les24hdutemps.fr/');
  const text = stripHtml(html);
  const m = text.match(/(\d{1,2})\s*&?\s*(\d{1,2})\s+juin\s+(\d{4})/i);
  if (!m) return null;
  return {
    locationIncludes: 'Besançon',
    dates: formatRange(parseInt(m[1], 10), parseInt(m[2], 10), 5, parseInt(m[3], 10)),
    source: 'les24hdutemps.fr',
  };
}

function syncMunichDates(bourses, expectedDates) {
  const munich = bourses.filter((b) => b.location.includes('Munich (Allemagne)'));
  const current = munich.map((b) => b.dates).sort();
  const expected = [...expectedDates].sort();
  const missing = expected.filter((d) => !current.includes(d));
  const extra = current.filter((d) => !expected.includes(d));
  return { missing, extra, changed: missing.length + extra.length };
}

async function main() {
  const bourses = JSON.parse(readFileSync(dataPath, 'utf8'));
  const changes = [];

  const antik = await scrapeAntikUhrenboerse();
  if (antik) {
    for (const entry of bourses) {
      if (entry.location.includes(antik.locationIncludes) && entry.dates !== antik.dates) {
        changes.push({ location: entry.location, from: entry.dates, to: antik.dates, source: antik.source });
        entry.dates = antik.dates;
      }
    }
  }

  const besancon = await scrapeLes24hDuTemps();
  if (besancon) {
    for (const entry of bourses) {
      if (entry.location.includes(besancon.locationIncludes) && entry.dates !== besancon.dates) {
        changes.push({ location: entry.location, from: entry.dates, to: besancon.dates, source: besancon.source });
        entry.dates = besancon.dates;
      }
    }
  }

  const munich = await scrapeMunichWatchFair();
  const munichCheck = syncMunichDates(bourses, munich.expectedDates);
  if (munichCheck.missing.length) {
    changes.push({
      location: 'Munich (Allemagne)',
      note: `Dates manquantes vs ${munich.source}`,
      missing: munichCheck.missing,
    });
  }
  if (munichCheck.extra.length) {
    changes.push({
      location: 'Munich (Allemagne)',
      note: `Dates en trop vs ${munich.source}`,
      extra: munichCheck.extra,
    });
  }

  const rikketik = await scrapeRikketik();
  const rikketik2026 = rikketik.byYear['2026'] ?? [];
  const houten2026 = bourses.filter((b) => b.location.includes('Houten')).map((b) => b.dates);
  for (const date of rikketik2026) {
    if (!houten2026.includes(date)) {
      changes.push({
        location: 'Houten (Pays-Bas)',
        note: `Date Rikketik 2026 non présente dans l'agenda`,
        expected: date,
        source: rikketik.source,
      });
    }
  }

  writeFileSync(dataPath, `${JSON.stringify(bourses, null, 2)}\n`);

  console.log(`Agenda : ${bourses.length} bourses`);
  if (!changes.length) {
    console.log('Aucune modification automatique (sources alignées).');
    return;
  }
  console.log('Modifications :');
  for (const c of changes) {
    if (c.from && c.to) {
      console.log(`  • ${c.location} : ${c.from} → ${c.to} (${c.source})`);
    } else {
      console.log(`  • ${c.location} : ${JSON.stringify(c)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
