// Länderseiten ohne Claude-Aufwand: wählt aus den Rohdaten von laender-collect.mjs je Land die wichtigsten
// Meldungen der letzten 24 Stunden aus und hängt sie (auf Deutsch) an eine Ausgabe an.
//
//   node news/laender.mjs pick <stunden> <laender.json>
//       Je Land bis zu 2 × keep() Ereignisse (keep: 8, Deutschland/VAE 25, Zypern 20). Gleiche Ereignisse verschiedener Medien werden zusammengefasst;
//       Status nach Regel: mind. 2 anerkannte Medien oder mind. 3 verschiedene Medien = bestätigt, sonst unbestätigt.
//       Schreibt die Kandidaten nach laender.json (id, country, title, lang, source, url, sources, status) und gibt
//       für die Redaktion eine kompakte Liste ohne Links aus: „id | Land | Sprache | Anzahl Medien | Titel“.
//   node news/laender.mjs merge <ausgabe.json> <laender.json> <uebersetzung.json>
//       uebersetzung.json = { "<id>": "deutscher Titel" } für jeden Eintrag, der bleiben soll (Claude übersetzt
//       und sortiert Doppelte/Unsinn aus). Schreibt `briefs: { "<ISO>": [ { title, source, url, also, status } ] }`
//       in die Ausgabe. Einträge ohne Titel in uebersetzung.json fallen weg: In der Ausgabe steht nichts auf Englisch.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES } from './countries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'data', 'news', 'laender');
// Wie viele Meldungen je Land in die Ausgabe kommen (Deutschland, VAE, Zypern ausführlich), und doppelt so viele
// Kandidaten, aus denen die Redaktion Doppelte und Unsinn aussortiert.
const KEEP = { DE: 25, AE: 25, CY: 20 };
const keep = (code) => KEEP[code] || 8;

// Anerkannte Medien (wie in EDITOR-v2.md), so wie Google News sie als Quelle nennt.
const RECOGNIZED = /reuters|associated press|\bap news\b|\bafp\b|\bdpa\b|bloomberg|financial times|wall street journal|new york times|washington post|\bbbc\b|guardian|economist|sky news|\bcnn\b|cnbc|\bnpr\b|tagesschau|\bard\b|\bzdf\b|deutschlandfunk|spiegel|frankfurter allgemeine|\bfaz\b|süddeutsche|zeit online|\bdie zeit\b|handelsblatt|\bwelt\b|n-tv|deutsche welle|\bdw\b|\bnzz\b|neue zürcher|\borf\b|le monde|france 24|al jazeera|al arabiya|the national|gulf news|khaleej times|arab news|times of israel|haaretz|\bnhk\b|kyodo|south china morning post|\bscmp\b|yonhap|times of india|the hindu|\babc\b|coindesk|the block|tagesspiegel|stern|focus online|rnd|br24|ndr|wdr|mdr|swr|srf|kurier|der standard|krone/i;

const DE_WORDS = new Set('der die das und den dem des ein eine einer nicht mit für von auf nach im ist sind wird werden bei über zum zur aus vor gegen wie auch soll will hat haben neue neuer'.split(' '));
const EN_WORDS = new Set('the and of to for on with after is are was were as at by from over amid says said new will has have its their'.split(' '));
function lang(title) {
  const w = title.toLowerCase().split(/[^a-zäöüß]+/);
  const de = w.filter((x) => DE_WORDS.has(x)).length + (/[äöüß]/i.test(title) ? 1 : 0);
  const en = w.filter((x) => EN_WORDS.has(x)).length;
  return de > en ? 'de' : 'en';
}

// Die Meldung muss das Land im Titel nennen (Wortstamm, damit auch „zyprische“, „Cypriot“, „Moroccan“ passen).
// Sonst landen Treffer, bei denen das Land nur im Text oder im Namen der Zeitung vorkommt („Cyprus Mail“), auf der Seite.
const EN = new Intl.DisplayNames('en', { type: 'region' });
const ALIAS = { US: ['usa', 'us-', 'amerikan', 'american', 'washington', 'trump'], GB: ['brit', 'uk ', 'london', 'england', 'schottland', 'scotland'],
  AE: ['vae', 'uae', 'emirat', 'dubai', 'abu dhabi'], DE: ['deutsch', 'german', 'bundes', 'berlin', 'merz'], EU: ['eu-', 'eu ', 'brüssel', 'brussels', 'europäische'],
  PS: ['gaza', 'westjordan', 'west bank', 'palästin', 'palestin'], CN: ['chines', 'peking', 'beijing'], RU: ['russ', 'moskau', 'moscow', 'kreml', 'kremlin'],
  NL: ['niederländ', 'dutch', 'holland'], CH: ['schweizer', 'swiss'], KR: ['südkorea', 'south korea', 'seoul'], KP: ['nordkorea', 'north korea', 'pjöngjang', 'pyongyang'],
  CY: ['nikosia', 'nicosia', 'limassol', 'larnaka', 'larnaca', 'paphos', 'famagusta'],
  CD: ['kongo', 'congo', 'kinshasa'], CG: ['kongo', 'congo', 'brazzaville'], CZ: ['tschech', 'czech'], VA: ['vatikan', 'vatican', 'papst', 'pope'] };
const stem = (n) => n.toLowerCase().replace(/[^a-zäöüéèçíóáñ ]/g, '').slice(0, Math.max(4, n.length - 2));
const KEYS = Object.fromEntries(Object.entries(COUNTRIES).map(([k, c]) => [k, [stem(c.name), stem(EN.of(k) || c.name), ...(ALIAS[k] || [])]]));
const mentions = (code, title) => { const t = ' ' + title.toLowerCase() + ' '; return KEYS[code].some((k) => t.includes(k)); };
// Syndizierte Füllmeldungen („Cyprus Daily Life“), Börsen-Tipps, Werbung.
const JUNK = /daily life|stocks to watch|aktie\b|-aktie|kursziel|price prediction|poker|horoskop|gewinnspiel|\bodds\b|betting|wetten/i;

const STOP = new Set([...DE_WORDS, ...EN_WORDS, 'news', 'nachrichten', 'live', 'update', 'video', 'jetzt', 'heute', 'today']);
// Wortanfänge (6 Zeichen), damit „Zugunglück“/„Zugunglücks“ oder „tödlichen“/„tödliches“ zusammenpassen.
const tokens = (t) => new Set(t.toLowerCase().split(/[^a-zäöüß0-9]+/).filter((x) => x.length > 3 && !STOP.has(x)).map((x) => x.slice(0, 6)));
const similar = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n >= 2 && n / Math.min(a.size, b.size) >= 0.34; };

function load(hours) {
  const since = Date.now() - hours * 3600 * 1000;
  const items = [];
  const day = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  for (const d of [day(new Date(Date.now() - 86400000)), day(new Date())]) {
    const f = join(DIR, `${d}.jsonl`);
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const i = JSON.parse(line);
        if (Date.parse(i.published || i.collected) < since || !COUNTRIES[i.country]) continue;
        // Medien hängen oft „— Cyprus Mail“ an; das zählt nicht als Nennung des Landes.
        i.title = i.title.replace(/\s+[—–-]\s+[^—–-]{2,40}$/, (m) => (/(mail|news|times|post|herald|daily|today|zeitung)/i.test(m) ? '' : m));
        if (i.title.split(/\s+/).length < 5 || JUNK.test(i.title) || !mentions(i.country, i.title)) continue;
        items.push(i);
      } catch {}
    }
  }
  return items;
}

function pick(hours) {
  const byCountry = new Map();
  for (const i of load(hours)) {
    if (!byCountry.has(i.country)) byCountry.set(i.country, []);
    byCountry.get(i.country).push({ ...i, tok: tokens(i.title), lang: lang(i.title) });
  }
  const out = [];
  for (const [code, items] of byCountry) {
    const clusters = [];
    for (const i of items) {
      const c = clusters.find((cl) => cl.some((x) => similar(x.tok, i.tok)));
      if (c) c.push(i); else clusters.push([i]);
    }
    const score = (cl) => {
      const srcs = new Set(cl.map((x) => x.source));
      return srcs.size * 2 + [...srcs].filter((s) => RECOGNIZED.test(s)).length * 3;
    };
    clusters.sort((a, b) => score(b) - score(a)
      || Math.max(...b.map((x) => Date.parse(x.published || x.collected))) - Math.max(...a.map((x) => Date.parse(x.published || x.collected))));
    clusters.slice(0, keep(code) * 2).forEach((cl, k) => {
      const rank = (x) => (x.lang === 'de' ? 2 : 0) + (RECOGNIZED.test(x.source) ? 1 : 0);
      const best = [...cl].sort((a, b) => rank(b) - rank(a))[0];
      const sources = [];
      for (const x of cl) if (!sources.some((s) => s.name === x.source)) sources.push({ name: x.source, url: x.link });
      const recognized = sources.filter((s) => RECOGNIZED.test(s.name)).length;
      out.push({ id: `${code}-${k + 1}`, country: code, title: best.title, lang: best.lang, source: best.source, url: best.link,
        sources: sources.slice(0, 4), status: recognized >= 2 || sources.length >= 3 ? 'bestätigt' : 'unbestätigt' });
    });
  }
  return out;
}

const [, , cmd, a, b, c] = process.argv;
if (cmd === 'pick') {
  const list = pick(Number(a) || 24);
  writeFileSync(b, JSON.stringify(list));
  for (const x of list) console.log(`${x.id} | ${COUNTRIES[x.country].name} | ${x.lang} | ${x.sources.length} | ${x.title}`);
  const n = new Set(list.map((x) => x.country)).size;
  console.error(`laender: ${list.length} Meldungen aus ${n} Ländern, ${list.filter((x) => x.lang !== 'de').length} zu übersetzen`);
} else if (cmd === 'merge') {
  const raw = JSON.parse(readFileSync(a, 'utf8'));
  const ed = raw.data && raw.data.kind ? raw.data : raw;
  const tr = existsSync(c) ? JSON.parse(readFileSync(c, 'utf8')) : {};
  const briefs = {};
  let dropped = 0;
  for (const x of JSON.parse(readFileSync(b, 'utf8'))) {
    const title = tr[x.id];
    if (!title) { dropped++; continue; }
    if ((briefs[x.country] ||= []).length >= keep(x.country)) { dropped++; continue; }
    // Nur der Link des Hauptmediums; die übrigen Medien als Name (Google-News-Links sind sehr lang).
    briefs[x.country].push({ title, source: x.source, url: x.url, also: x.sources.map((s) => s.name).filter((n) => n !== x.source), status: x.status });
  }
  ed.briefs = briefs;
  ed.stats = { ...(ed.stats || {}), countries: new Set([...Object.keys(briefs), ...(ed.stories || []).map((s) => s.country).filter(Boolean)]).size };
  writeFileSync(a, JSON.stringify(raw, null, 1));
  console.log(`merge: ${Object.values(briefs).flat().length} Ländermeldungen aus ${Object.keys(briefs).length} Ländern, ${dropped} aussortiert oder ohne Übersetzung`);
} else {
  console.error('Aufruf: node news/laender.mjs pick <stunden> <laender.json> | merge <ausgabe.json> <laender.json> <uebersetzung.json>');
  process.exit(1);
}
