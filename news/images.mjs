// Lädt die Bilder der Meldungen der letzten Stunden herunter, verkleinert sie und legt sie
// in IMG_DIR ab (Checkout des Branches `news-images`, der bei jedem Lauf neu geschrieben wird).
// Aufruf: node news/images.mjs <IMG_DIR>
import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data', 'news');
const IMG_DIR = process.argv[2];
const WINDOW_MS = 3 * 3600 * 1000;
const MAX_NEW = 150;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const dayInTz = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const key = (link) => createHash('sha1').update(link).digest('hex').slice(0, 16);

const now = Date.now();
const items = [];
for (const d of [dayInTz(new Date(now)), dayInTz(new Date(now - 86400000))]) {
  const f = join(DATA_DIR, `${d}.jsonl`);
  if (!existsSync(f)) continue;
  for (const line of (await readFile(f, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    try {
      const i = JSON.parse(line);
      if (i.image && now - Date.parse(i.collected) < WINDOW_MS) items.push(i);
    } catch {}
  }
}

await mkdir(IMG_DIR, { recursive: true });
const wanted = new Map(items.map((i) => [`${key(i.link)}.jpg`, i]));
for (const f of await readdir(IMG_DIR)) {
  if (f.endsWith('.jpg') && !wanted.has(f)) await unlink(join(IMG_DIR, f));
}

async function grab(file, item) {
  const res = await fetch(item.image, { headers: { 'User-Agent': UA, Referer: item.link }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf).rotate().resize({ width: 720, withoutEnlargement: true }).jpeg({ quality: 70, mozjpeg: true }).toFile(join(IMG_DIR, file));
}

const todo = [...wanted].filter(([f]) => !existsSync(join(IMG_DIR, f))).slice(0, MAX_NEW);
let ok = 0, fail = 0;
for (let k = 0; k < todo.length; k += 8) {
  await Promise.all(todo.slice(k, k + 8).map(async ([f, i]) => {
    try { await grab(f, i); ok++; } catch { fail++; }
  }));
}

const index = {};
for (const [f, i] of wanted) {
  if (existsSync(join(IMG_DIR, f))) index[i.link] = { file: f, source: i.source, title: i.title };
}
await writeFile(join(IMG_DIR, 'index.json'), JSON.stringify(index, null, 1) + '\n');
console.log(`images: window=${wanted.size} downloaded=${ok} failed=${fail} stored=${Object.keys(index).length}`);
