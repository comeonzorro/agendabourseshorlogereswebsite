/**
 * Script local pour mettre à jour src/data/bourses.json
 * Usage : node scripts/scrape-bourses.js
 *
 * À compléter avec votre logique de scraping web.
 * Après exécution : git commit + push → Vercel redéploie automatiquement.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/data/bourses.json');

const bourses = JSON.parse(readFileSync(dataPath, 'utf8'));

console.log(`Agenda actuel : ${bourses.length} bourses`);
console.log('Ajoutez ici votre logique de scraping, puis écrivez le résultat :');
console.log('  writeFileSync(dataPath, JSON.stringify(nouvellesBourses, null, 2));');
