# Redaktionsanleitung Nachrichtenlage

Diese Anleitung steuert die geplanten Claude-Läufe, die aus den gesammelten Rohmeldungen
eine Ausgabe bauen. Sprache der Ausgabe: **Deutsch**. Zeitzone für Termine und Dokument-IDs: **Europe/Berlin**
(deutsche Zeit). Rohdaten-Dateinamen bleiben im Dubai-Datum.

## Leser

Deutscher, lebt in Dubai. Will wissen: was in **Deutschland** passiert, was in den **VAE/Golfregion**
passiert, die wichtigsten **Weltereignisse**, **Fed/Zinsen/Märkte** und **Krypto** (Bitcoin,
Shiba Inu, Regulierung und Krypto-Gesetze weltweit). Senior Security/IT-Berater, also auch
Cybersecurity- und Tech-Meldungen von Gewicht.

## Eingaben

- Rohmeldungen: `data/news/YYYY-MM-DD.jsonl` (Dateiname = Kalenderdatum Dubai), eine JSON-Zeile pro Meldung:
  `{source, cat, feed, title, link, summary, published, image, collected}`.
  `cat` ist die Feed-Kategorie: `de`, `uae`, `world`, `markets`, `business`, `crypto`.
  Gesammelt alle 15 Minuten per GitHub Action (`.github/workflows/news-collect.yml`), rund 40 Feeds.
- Feed-Zustand: `data/news/status.json` (welche Feeds zuletzt fehlschlugen).
- Bilder: Branch `news-images` (Bilder der letzten 13 Stunden, höchstens 700, 640px JPEG).
  `index.json` dort: `{ "<Artikel-Link>": { "file": "<hash>.jpg", "source": "...", "title": "..." } }`.
- Vorher immer `git pull` auf dem Default-Branch, damit die neuesten Daten da sind, und die Bilder holen:
  `git fetch --depth=1 origin news-images && rm -rf .news-img && mkdir .news-img && git --work-tree=.news-img checkout FETCH_HEAD -- . && git reset -q`
  (im Repo-Verzeichnis ausführen; `.news-img/` ist in `.gitignore`. Das Artifact-Tool lädt nur Dateien aus dem
  Arbeitsverzeichnis hoch, nicht aus `/tmp`.)

## Ausgabeziel

Artifact-Datenbank der Seite `https://claude.ai/artifact/RWKMSmyA63Z6uRavNQnqkK`,
Collection `editions`, geschrieben mit dem `ArtifactData`-Tool (`set`).
Die Seite selbst wird **nicht** neu veröffentlicht.

- `date`: Kalenderdatum in deutscher Zeit (Europe/Berlin).
- Dokument-ID: `<date>-morgen` (8:00), `<date>-mittag` (16:30), `<date>-abend` (21:00).
- `kind`: `morning`, `afternoon` oder `evening`; `hour`: `08:00`, `16:30` oder `21:00`.

```json
{
  "kind": "hourly | evening",
  "date": "2026-10-26",
  "hour": "14:00",
  "createdAt": "<ISO-Zeitstempel UTC>",
  "stats": { "stories": 18, "raw": 240, "confirmed": 14 },
  "lead": { "title": "...", "summary": "...", "why": "...", "status": "bestätigt", "image": { "url": "<Asset-URL>", "credit": "BBC" }, "sources": [{ "name": "BBC", "url": "https://..." }] },
  "sections": [ { "name": "Deutschland", "stories": [ { "title": "...", "summary": "...", "why": "...", "status": "bestätigt|unbestätigt|widersprüchlich", "image": { "url": "...", "credit": "..." }, "sources": [ { "name": "...", "url": "..." } ] } ] } ],
  "intro": "nur Abendausgabe: 3–5 Sätze, der Tag in Kürze",
  "outlook": ["nur Abendausgabe: was morgen wichtig wird, 3–5 Punkte"]
}
```

Ressorts (nur befüllte verwenden, in dieser Reihenfolge):
1. **Deutschland**: Politik, Wirtschaft, Gesellschaft
2. **VAE & Golf**: Dubai, Abu Dhabi, Saudi-Arabien, Katar, Iran, Gesetze/Visa/Regeln, die Einwohner betreffen
3. **Welt**
4. **Fed, Zinsen & Märkte**: Fed, EZB, Inflation, Dollar, Öl, Gold, Aktienindizes
5. **Krypto**: Bitcoin, Shiba Inu, große Altcoins, ETFs, **Regulierung und Gesetze nach Ländern**
6. **Unternehmen**
7. **Technologie & Sicherheit**: Cyberangriffe, Datenlecks, KI, Big Tech
8. **Weitere Meldungen**

Jedes der Ressorts 1–5 soll in jeder Ausgabe mindestens 2 Meldungen haben. Gibt der Feed in der
Stunde zu wenig her, per `WebSearch` aktiv nachsuchen (z. B. "Dubai news today", "Bundesregierung
heute", "Fed rate", "Bitcoin price news", "Shiba Inu news", "crypto regulation law <Land>").

## Faktencheck (streng)

Ziel: so wenig `unbestätigt` wie möglich, ohne etwas zu erfinden. Jede Meldung bekommt einen Status:

- `bestätigt`, wenn mindestens eins davon zutrifft:
  - Zwei **unabhängige** Medienhäuser berichten den Kern übereinstimmend. Handelsblatt + Tagesschau = 2,
    BBC + Al Jazeera = 2. Mehrere Medien, die nur dieselbe Agenturmeldung (Reuters/AP/dpa/AFP) übernehmen,
    zählen als **eine** Quelle.
  - Die **Primärquelle** bestätigt selbst: Pressemitteilung des Unternehmens, Regierung, Ministerium,
    Zentralbank (Fed, EZB), WAM (VAE-Staatsagentur), Gerichtsdokument, offizieller Social-Media-Account.
  - **Reaktionen Dritter**, über die ein **anderes** Medium berichtet (z. B. Politiker oder Gewerkschaft
    reagieren öffentlich auf die Meldung). Beispiel: Audi-Werk in den USA. Trump verkündet es öffentlich mit
    dem Audi-Chef auf der Bühne, SPD und IG Metall reagieren, Tagesschau/Spiegel berichten → `bestätigt`.
- `widersprüchlich`: Quellen nennen abweichende Kernfakten (Zahlen, Täter, Ort, Ursache).
  Im `summary` benennen, wer was sagt.
- `unbestätigt`: nur, wenn nach der Suche unten wirklich nur eine Quelle existiert.

**Pflicht-Vergleich** für jede Meldung, die nach den Feeds nur eine Quelle hat:
1. Zuerst die Rohdaten aller ~40 Feeds nach demselben Ereignis durchsuchen (Stichworte auf Deutsch und Englisch,
   Namen, Firmen, Orte).
2. Dann mindestens **zwei** `WebSearch`-Abfragen: eine deutsch, eine englisch. Bei wichtigen Meldungen
   (Aufmacher, Politik, Märkte, Gesetze) `mode: "extended"` verwenden, weil die Standard-Suche
   ganz neue Meldungen oft noch nicht kennt.
3. Gefundene Bestätigungen als zusätzliche Quellen eintragen.

Zahlen (Kurse, Opferzahlen, Beträge) immer mit Stand-Zeit angeben, wenn sie sich schnell ändern.
Krypto-Kurse nur nennen, wenn eine aktuelle Quelle den Wert nennt, nie schätzen.

## Bilder

- Jede Meldung mit Bild, wenn möglich, der Aufmacher immer.
- Bild finden: Für jede Quelle einer Meldung im `index.json` nach dem Artikel-Link suchen. Hat das eigene Medium
  kein Bild, das Bild eines **anderen Mediums zum selben Ereignis** nehmen (über die Rohdaten den passenden
  Link finden). Das Bild muss inhaltlich zur Meldung passen. Kein Bild ist besser als ein falsches.
- Spam meiden: Google-News-Treffer von openPR, Presale-Werbung, "price prediction", Gewinnspiel-/Code-Seiten
  (Coin Gabbar u. ä.) sind keine Nachrichten und keine Quellen.
- Hochladen: zuerst einmal `Artifact` `action: "read"` mit der Artifact-URL (nötig, bevor auf das Artifact
  geschrieben werden darf), dann `Artifact` publish mit `url`, `asset: true` und
  `file_paths: ["<repo>/.news-img/<hash>.jpg", ...]` (absolute Pfade) (bis 25 pro Aufruf). Die zurückgegebene `url` jedes Bildes
  exakt so in `image.url` eintragen, `image.credit` = Name des Mediums.
- Die Seite NIE neu veröffentlichen (kein publish ohne `asset: true`).

## Briefings (8:00, 16:30, 21:00 deutscher Zeit)

Drei Ausgaben am Tag. Jede deckt **alles seit dem vorigen Briefing** ab
(Morgen: seit 21:00 Uhr des Vortags, Nachmittag: seit 8:00, Abend: seit 16:30).

1. Meldungen laden, deren `collected` nach dem vorigen Briefing liegt (heutige und gestrige Datei prüfen).
2. Gleiche Ereignisse über Quellen hinweg zusammenführen.
3. Faktencheck wie oben. Keine Annahmen, keine Vermutungen, keine Prognosen: nur, was Quellen berichten.
4. **Paywall/kurzer Text** (v. a. Handelsblatt, FAZ+, Spiegel+): Nur Titel/Teaser vorhanden → Inhalt per
   `WebSearch` und aus den anderen Feeds füllen und diese als Quellen angeben.
   Nie Inhalte erfinden oder aus dem Titel extrapolieren.
5. **Breite statt Wiederholung:** 30–50 Meldungen aus möglichst vielen Ländern und Themen
   (Politik, Wirtschaft, Finanzen, Krypto, Tech, Wissenschaft, Gesellschaft, Sport).
   Deutschland und die Golfregion ausführlich, übrige Länder nur ihre wichtigsten Meldungen.
   Das vorige Briefing mit `ArtifactData` `get` laden: Höchstens ein Viertel der Meldungen darf dort schon
   gestanden haben, und nur mit **neuem Stand**; dann `"update": true` setzen und das Neue im Text nennen.
   Unveränderte Themen nicht wiederholen.
6. `lead` = wichtigste Meldung seit dem vorigen Briefing, bevorzugt mit Bezug zu Deutschland oder den VAE,
   wenn gleich wichtig.
7. `summary`: 2–4 sachliche Sätze mit den Kernfakten (wer, was, wann, wie viel). `why` nur, wenn es
   berichtete Fakten zum Hintergrund gibt, keine eigene Bewertung. Wertende Sprache der Quellen nicht übernehmen.
8. Bilder wie oben.
9. Dokument mit `ArtifactData` `set` schreiben. Existiert die Dokument-ID schon (Wiederholungslauf),
   vorher `get` und mit `if_version` überschreiben. `stats` muss zu den tatsächlich geschriebenen
   Meldungen passen (`stories` = lead + alle Ressort-Meldungen).

**Nur Abend (21:00):** zusätzlich `intro` (3–5 Sätze: der Tag in Kürze) und `outlook` (konkrete Termine von
morgen: Notenbanken, Datenveröffentlichungen, Wahlen, Gesetze, die in Kraft treten). Statusangaben aus
Morgen- und Nachmittagsbriefing neu prüfen: was inzwischen bestätigt ist, wird hochgestuft.

## Telegram-Bericht

Jeder Bericht ist EINE Telegram-Nachricht: die HTML-Datei (Zeitungsdesign) als Dokument, darunter der
Kurztext mit Top-Story und Telegraph-Link. Ablauf nach dem Schreiben der Ausgabe:

1. Die geschriebene Ausgabe als JSON-Datei speichern (dasselbe Objekt wie beim `set`), z. B. `/tmp/ausgabe.json`.
2. Telegraph-Seite: `node news/telegraph.mjs /tmp/ausgabe.json` → gibt die URL aus (Instant View in Telegram).
3. HTML-Datei: `node news/html.mjs /tmp/ausgabe.json /tmp/Nachrichtenlage-<Morgen|Nachmittag|Abend>.html .news-img`
   (bettet die Bilder aus `.news-img/` ein).
4. Senden an Kanal und Privatchat:

```bash
TELEGRAM_CHAT_ID=-1003977342508,7077870551 TELEGRAM_DOCUMENT=/tmp/Nachrichtenlage-Morgen.html bash news/telegram.sh <<'MSG'
☀️ Morgenbriefing · Mittwoch, 29. Oktober

⭐ Top-Story: <Titel des Aufmachers>
<1–2 Sätze Kern des Aufmachers> ✅

Außerdem:
1. <Schlagzeile> ✅
2. <Schlagzeile> ✅
3. <Schlagzeile> ⚠️
4. <Schlagzeile> ✅
5. <Schlagzeile> ✅

22 Meldungen, 19 bestätigt
⚡ Schnell lesen: <Telegraph-URL>
📎 Datei oben: ganze Ausgabe im Zeitungsdesign
MSG
```

- Der Text ist eine Bildunterschrift und darf höchstens 1024 Zeichen lang sein. Top-Story-Text kurz halten.
- Titel je Briefing: „☀️ Morgenbriefing“, „🕓 Nachmittagsbriefing“, „🌙 Abendbriefing“, dazu Wochentag und Datum.
- „Außerdem“: die 5 nächstwichtigen Meldungen, Deutschland/VAE bevorzugt, aus verschiedenen Ländern/Themen.
  Abendbriefing: statt Top-Story-Text das `intro` (gekürzt).
- Status-Zeichen: ✅ bestätigt, ⚠️ unbestätigt, ❗ widersprüchlich.
- Den claude.ai-Link NICHT in Telegram posten (Mitglieder können ihn nicht öffnen).
- Schlägt Telegraph fehl: Zeile „⚡ Schnell lesen“ weglassen. Schlägt HTML fehl: ohne `TELEGRAM_DOCUMENT`
  senden. Fehler im Abschlussbericht nennen.
- Das Skript sendet nur, wenn `TELEGRAM_BOT_TOKEN` gesetzt ist. Seine Ausgabe im Abschlussbericht nennen.

## Grenzen

- Nichts committen oder pushen. Die Ausgabe landet nur in der Artifact-Datenbank und ihrem Bilderspeicher.
- Fehlschlagende Feeds aus `status.json` als Lücke behandeln und per `WebSearch` abdecken.
