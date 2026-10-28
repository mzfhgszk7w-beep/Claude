// Baut aus einer Ausgabe (JSON wie in der Artifact-Datenbank, Collection `editions`) eine Telegraph-Seite
// und gibt deren URL aus. Leser öffnen sie in Telegram per Instant View, ohne Konto.
// Aufruf: node news/telegraph.mjs <ausgabe.json>
// Braucht api.telegra.ph als erlaubte Domain. Bilder werden direkt von den Nachrichtenseiten eingebunden
// (Original-URL aus data/news/*.jsonl), weil Telegraph keine eigenen Uploads mehr annimmt.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data', 'news');
const API = 'https://api.telegra.ph';
const SITE = 'https://claude.ai/artifact/RWKMSmyA63Z6uRavNQnqkK';

const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const ed = raw.data && raw.data.kind ? raw.data : raw;

// Original-Bild-URL je Artikel-Link (ohne Query), aus den Rohdaten der letzten Tage.
const norm = (u) => { try { const x = new URL(u); return x.origin + x.pathname.replace(/\/$/, ''); } catch { return u; } };
const imageByLink = new Map();
for (const f of readdirSync(DATA_DIR).filter((n) => n.endsWith('.jsonl')).sort().slice(-3)) {
  for (const line of readFileSync(join(DATA_DIR, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const i = JSON.parse(line); if (i.image) imageByLink.set(norm(i.link), { src: i.image, credit: i.source }); } catch {}
  }
}
const findImage = (story) => {
  for (const s of story.sources || []) { const hit = imageByLink.get(norm(s.url)); if (hit) return hit; }
  return null;
};

const MARK = { 'bestätigt': '✅ bestätigt', 'unbestätigt': '⚠️ unbestätigt', 'widersprüchlich': '❗ widersprüchlich' };
const fmtDay = (d) => new Date(d + 'T12:00:00+04:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' });

function storyNodes(s, lead) {
  const out = [{ tag: lead ? 'h3' : 'h4', children: [s.title] }];
  const img = findImage(s);
  if (img) out.push({ tag: 'figure', children: [{ tag: 'img', attrs: { src: img.src } }, { tag: 'figcaption', children: ['Bild: ' + img.credit] }] });
  out.push({ tag: 'p', children: [{ tag: 'strong', children: [MARK[s.status] || MARK['unbestätigt']] }] });
  if (s.summary) out.push({ tag: 'p', children: [s.summary] });
  if (s.why) out.push({ tag: 'blockquote', children: [{ tag: 'strong', children: ['Einordnung: '] }, s.why] });
  const links = (s.sources || []).filter((x) => /^https?:/.test(x.url));
  if (links.length) {
    const kids = ['Quellen: '];
    links.forEach((x, k) => { if (k) kids.push(' · '); kids.push({ tag: 'a', attrs: { href: x.url }, children: [x.name] }); });
    out.push({ tag: 'p', children: [{ tag: 'em', children: kids }] });
  }
  return out;
}

const content = [];
const st = ed.stats || {};
content.push({ tag: 'p', children: [{ tag: 'em', children: [
  `${fmtDay(ed.date)} · ${st.stories ?? '?'} Meldungen, ${st.confirmed ?? '?'} bestätigt · Deutschland · VAE · Welt · Märkte · Krypto`,
] }] });
if (ed.kind === 'evening' && ed.intro) content.push({ tag: 'blockquote', children: [ed.intro] });
if (ed.lead) content.push(...storyNodes(ed.lead, true));
for (const sec of ed.sections || []) {
  if (!sec.stories || !sec.stories.length) continue;
  content.push({ tag: 'hr' }, { tag: 'h3', children: [sec.name] });
  for (const s of sec.stories) content.push(...storyNodes(s, false));
}
if (ed.outlook && ed.outlook.length) {
  content.push({ tag: 'hr' }, { tag: 'h3', children: ['Was morgen wichtig wird'] }, { tag: 'ul', children: ed.outlook.map((o) => ({ tag: 'li', children: [o] })) });
}
content.push({ tag: 'hr' }, { tag: 'p', children: [{ tag: 'em', children: [
  '✅ mind. 2 unabhängige Quellen · ⚠️ nur eine Quelle · ❗ Quellen widersprechen sich. Rund 45 Quellen, Briefing täglich um 8:00 Uhr (deutsche Zeit). ',
  { tag: 'a', attrs: { href: SITE }, children: ['Archiv'] },
] }] });

// curl statt fetch: curl folgt dem HTTPS-Proxy der Umgebung, Node-fetch nicht.
function call(method, params) {
  const args = ['-sS', '-m', '30', `${API}/${method}`];
  for (const [k, v] of Object.entries(params)) args.push('--data-urlencode', `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`);
  const j = JSON.parse(execFileSync('curl', args, { encoding: 'utf8', maxBuffer: 8 << 20 }));
  if (!j.ok) throw new Error(`${method}: ${j.error}`);
  return j.result;
}

// Telegraph-Seiten dürfen höchstens 64 KB groß sein; notfalls Meldungen von hinten kürzen.
while (Buffer.byteLength(JSON.stringify(content)) > 62000) content.splice(content.length - 3, 1);

const NAME = { morning: 'Morgenbriefing', afternoon: 'Nachmittagsbriefing', evening: 'Abendbriefing' };
const title = `Nachrichtenlage ${NAME[ed.kind] || ed.hour + ' Uhr'} · ${fmtDay(ed.date)}`;
const acc = call('createAccount', { short_name: 'NexorNews', author_name: 'Nexor News' });
const page = call('createPage', { access_token: acc.access_token, title, author_name: 'Nexor News', content });
console.log(page.url);
