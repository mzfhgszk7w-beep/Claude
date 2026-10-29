// Länder-Sammler: fragt für jedes Land aus countries.mjs Google News ab (zuerst deutsch, bei zu wenig Treffern
// zusätzlich englisch) und hängt neue Meldungen an data/news/laender/YYYY-MM-DD.jsonl an (Datum Asia/Dubai).
// Pro Aufruf höchstens MAX_PER_RUN Länder, jeweils die am längsten nicht abgefragten; so ist jedes Land etwa
// alle 1–2 Stunden dran, ohne Google mit 400 Anfragen auf einmal zu belasten.
// Läuft in der GitHub Action (news/loop.sh); im Claude-Container ist Google News gesperrt.
import { readFile, appendFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES } from './countries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'data', 'news', 'laender');
const STATE = join(DIR, 'state.json');
const MAX_PER_RUN = 70;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const EN = new Intl.DisplayNames('en', { type: 'region' });
// Suchbegriffe, wo der Ländername allein mehrdeutig oder ungebräuchlich ist.
const QUERY_DE = { EU: 'Europäische Union', PS: 'Gaza OR Westjordanland', CD: 'Kongo Kinshasa', CG: 'Kongo Brazzaville', GB: 'Großbritannien OR Grossbritannien', US: 'USA', AE: 'VAE OR Emirate OR Dubai OR "Abu Dhabi"' };
const QUERY_EN = { EU: 'European Union', PS: 'Gaza OR "West Bank"', CD: 'DR Congo', CG: 'Congo-Brazzaville', US: 'United States', AE: 'UAE OR Dubai OR "Abu Dhabi"' };
// Keine Nachrichten: Pressemitteilungs-Portale, Kurs-Prognosen, Werbung.
const SPAM = /openpr|presseportal|einpresswire|prnewswire|globenewswire|coingabbar|price prediction|kursprognose|presale/i;

const dayInTz = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const tag = (b, name) => { const m = b.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')); return m ? decode(m[1]) : ''; };

async function search(q, lang) {
  const loc = lang === 'de' ? 'hl=de&gl=DE&ceid=DE:de' : 'hl=en-US&gl=US&ceid=US:en';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:1d`)}&${loc}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const out = [];
  for (const m of (await res.text()).matchAll(/<item>[\s\S]*?<\/item>/gi)) {
    const b = m[0];
    const source = tag(b, 'source');
    let title = tag(b, 'title');
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    const link = tag(b, 'link');
    const pub = tag(b, 'pubDate');
    if (!title || !link || SPAM.test(source + ' ' + title)) continue;
    out.push({ title, source, link, published: pub && !isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : null, query: lang });
  }
  return out;
}

await mkdir(DIR, { recursive: true });
const state = existsSync(STATE) ? JSON.parse(await readFile(STATE, 'utf8')) : {};
const now = new Date();
const today = dayInTz(now);
const seen = new Set();
for (const d of [today, dayInTz(new Date(now - 86400000))]) {
  const f = join(DIR, `${d}.jsonl`);
  if (!existsSync(f)) continue;
  for (const line of (await readFile(f, 'utf8')).split('\n')) { try { seen.add(JSON.parse(line).link); } catch {} }
}

const due = Object.keys(COUNTRIES).sort((a, b) => (state[a] || '').localeCompare(state[b] || '')).slice(0, MAX_PER_RUN);
const fresh = [];
let failed = 0;
for (let k = 0; k < due.length; k += 5) {
  await Promise.all(due.slice(k, k + 5).map(async (code) => {
    try {
      const de = await search(QUERY_DE[code] || `"${COUNTRIES[code].name}"`, 'de');
      // Immer auch englisch: deutsche Treffer drehen sich oft nur um ein Ereignis mit Deutschland-Bezug.
      const en = await search(QUERY_EN[code] || `"${EN.of(code)}"`, 'en');
      for (const i of [...de, ...en]) {
        if (seen.has(i.link)) continue;
        seen.add(i.link);
        fresh.push({ country: code, ...i, collected: now.toISOString() });
      }
      state[code] = now.toISOString();
    } catch { failed++; }
  }));
  await new Promise((r) => setTimeout(r, 1500));
}

if (fresh.length) await appendFile(join(DIR, `${today}.jsonl`), fresh.map((i) => JSON.stringify(i)).join('\n') + '\n');
await writeFile(STATE, JSON.stringify(state, null, 1) + '\n');
console.log(`laender: ${due.length} Länder abgefragt, ${fresh.length} neue Meldungen, ${failed} Fehler`);
