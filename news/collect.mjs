// News collector: pulls RSS feeds and appends new items to data/news/YYYY-MM-DD.jsonl
// (date in Asia/Dubai). No dependencies; runs on Node >= 18 via GitHub Actions.
import { readFile, appendFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data', 'news');
const TZ = 'Asia/Dubai';

const FEEDS = [
  { source: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen' },
  { source: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/top-themen' },
  { source: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/finanzen' },
  { source: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/unternehmen' },
  { source: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/politik' },
  { source: 'BBC', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { source: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'BBC', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { source: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/home.xml' },
  { source: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/world.xml' },
  { source: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/latest.xml' },
  { source: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/world.xml' },
  { source: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
];

const dayInTz = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};

function parseFeed(xml) {
  const items = [];
  for (const m of xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)) {
    const b = m[0];
    let link = tag(b, 'link');
    if (!link) link = (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';
    const title = tag(b, 'title');
    if (!title || !link) continue;
    const pub = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date');
    const date = pub && !isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : null;
    items.push({
      title,
      link: link.split('#')[0],
      summary: (tag(b, 'description') || tag(b, 'summary')).slice(0, 600),
      published: date,
    });
  }
  return items;
}

async function fetchFeed({ source, url }) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (news-collector; +https://github.com)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseFeed(await res.text()).map((i) => ({ source, feed: url, ...i }));
}

async function loadSeen(days) {
  const seen = new Set();
  for (const d of days) {
    const f = join(DATA_DIR, `${d}.jsonl`);
    if (!existsSync(f)) continue;
    for (const line of (await readFile(f, 'utf8')).split('\n')) {
      if (!line.trim()) continue;
      try { seen.add(JSON.parse(line).link); } catch {}
    }
  }
  return seen;
}

const now = new Date();
const today = dayInTz(now);
const yesterday = dayInTz(new Date(now.getTime() - 86400000));
await mkdir(DATA_DIR, { recursive: true });
const seen = await loadSeen([today, yesterday]);

const status = [];
const fresh = [];
const results = await Promise.allSettled(FEEDS.map(fetchFeed));
results.forEach((r, i) => {
  const { source, url } = FEEDS[i];
  if (r.status === 'rejected') {
    status.push({ source, url, ok: false, error: String(r.reason?.message || r.reason) });
    return;
  }
  let added = 0;
  for (const item of r.value) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    fresh.push({ ...item, collected: now.toISOString() });
    added++;
  }
  status.push({ source, url, ok: true, items: r.value.length, added });
});

if (fresh.length) {
  await appendFile(join(DATA_DIR, `${today}.jsonl`), fresh.map((i) => JSON.stringify(i)).join('\n') + '\n');
}
await writeFile(join(DATA_DIR, 'status.json'), JSON.stringify({ run: now.toISOString(), feeds: status }, null, 2) + '\n');

for (const s of status) console.log(s.ok ? `ok   ${s.source} ${s.url} items=${s.items} new=${s.added}` : `FAIL ${s.source} ${s.url} ${s.error}`);
console.log(`total new: ${fresh.length} -> ${today}.jsonl`);
