# Redaktionsanleitung Nachrichtenlage

Diese Anleitung steuert die geplanten Claude-Läufe, die aus den gesammelten Rohmeldungen
eine Ausgabe bauen. Sprache der Ausgabe: **Deutsch**. Zeitzone: **Asia/Dubai (UTC+4)**.

## Leser

Deutscher, lebt in Dubai. Will wissen: was in **Deutschland** passiert, was in den **VAE/Golfregion**
passiert, die wichtigsten **Weltereignisse**, **Fed/Zinsen/Märkte** und **Krypto** (Bitcoin,
Shiba Inu, Regulierung und Krypto-Gesetze weltweit). Senior Security/IT-Berater, also auch
Cybersecurity- und Tech-Meldungen von Gewicht.

## Eingaben

- Rohmeldungen: `data/news/YYYY-MM-DD.jsonl` (Dateiname = Kalenderdatum Dubai), eine JSON-Zeile pro Meldung:
  `{source, cat, feed, title, link, summary, published, image, collected}`.
  `cat` ist die Feed-Kategorie: `de`, `uae`, `world`, `markets`, `business`, `crypto`.
  Gesammelt alle 20 Minuten per GitHub Action (`.github/workflows/news-collect.yml`), rund 40 Feeds.
- Feed-Zustand: `data/news/status.json` (welche Feeds zuletzt fehlschlugen).
- Bilder: Branch `news-images` (nur Bilder der letzten 3 Stunden, 720px JPEG).
  `index.json` dort: `{ "<Artikel-Link>": { "file": "<hash>.jpg", "source": "...", "title": "..." } }`.
- Vorher immer `git pull` auf dem Default-Branch, damit die neuesten Daten da sind, und die Bilder holen:
  `git fetch --depth=1 origin news-images && rm -rf .news-img && mkdir .news-img && git --work-tree=.news-img checkout FETCH_HEAD -- . && git reset -q`
  (im Repo-Verzeichnis ausführen; `.news-img/` ist in `.gitignore`. Das Artifact-Tool lädt nur Dateien aus dem
  Arbeitsverzeichnis hoch, nicht aus `/tmp`.)

## Ausgabeziel

Artifact-Datenbank der Seite `https://claude.ai/artifact/RWKMSmyA63Z6uRavNQnqkK`,
Collection `editions`, geschrieben mit dem `ArtifactData`-Tool (`set`).
Die Seite selbst wird **nicht** neu veröffentlicht.

- `date`: der **Nachrichtentag** = Dubai-Datum der Ausgabezeit minus 3 Stunden
  (die Ausgaben um 00, 01, 02 Uhr gehören noch zum Vortag).
- Dokument-ID: stündlich `<date>-h<HH>` (z. B. `2026-10-26-h14`, `2026-10-26-h01`), Abend `<date>-abend`.

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

## Stündliche Ausgabe

1. Meldungen mit `collected` in den letzten 65 Minuten laden (heutige und gestrige Datei prüfen).
2. Gleiche Ereignisse über Quellen hinweg zusammenführen.
3. Faktencheck wie oben.
4. **Paywall/kurzer Text** (v. a. Handelsblatt, FAZ+, Spiegel+): Nur Titel/Teaser vorhanden → Inhalt per
   `WebSearch` und aus den anderen Feeds füllen und diese als Quellen angeben.
   Nie Inhalte erfinden oder aus dem Titel extrapolieren.
5. Auswahl: **15–25 Meldungen**, relevanteste zuerst. `lead` = wichtigste Meldung der Stunde, bevorzugt
   mit Bezug zu Deutschland oder den VAE, wenn gleich wichtig.
   Keine Wiederholung aus der Vorstunde, außer es gibt neue Entwicklungen (dann im Titel kennzeichnen).
   Die Vorstunde mit `ArtifactData` `get` auf die vorige Dokument-ID prüfen.
6. `summary`: 2–4 sachliche Sätze mit den Kernfakten (wer, was, wann, wie viel). `why`: 1 Satz Einordnung,
   was es für den Leser bedeutet (Deutschland, Leben in den VAE, Geldanlage, Krypto-Bestände, Sicherheit).
   Wertende Sprache der Quellen nicht übernehmen.
7. Bilder wie oben.
8. Dokument mit `ArtifactData` `set` schreiben. Existiert die Dokument-ID schon (Wiederholungslauf),
   vorher `get` und mit `if_version` überschreiben. `stats` muss zu den tatsächlich geschriebenen
   Meldungen passen (`stories` = lead + alle Ressort-Meldungen). Fertig, keine weiteren Aktionen.

## Abendausgabe (23 Uhr)

- Grundlage: alle Rohmeldungen des Nachrichtentags plus die stündlichen Ausgaben des Tages
  (`ArtifactData` `query` auf `editions` mit `date == <date>`).
- **25–40 Meldungen** über alle Ressorts, die den Tag geprägt haben, mit aktuellem Stand
  (spätere Entwicklungen ersetzen frühere). Gleicher Faktencheck. Statusangaben aus den Stundenausgaben
  neu prüfen: was inzwischen bestätigt ist, wird hochgestuft.
- Bilder aus den Stundenausgaben wiederverwenden (dieselbe `image.url`), neue nur bei Bedarf hochladen.
- `intro` und `outlook` sind Pflicht. `outlook` nennt konkrete Termine von morgen (Fed-Reden,
  Datenveröffentlichungen, Wahlen, Gesetze, die in Kraft treten).

## Telegram-Bericht

Nach dem Schreiben der Ausgabe:

1. Die geschriebene Ausgabe als JSON-Datei speichern (dasselbe Objekt wie beim `set`) und daraus eine
   Telegraph-Seite bauen: `node news/telegraph.mjs <ausgabe.json>`. Ausgabe ist die URL der Seite
   (Instant View in Telegram, ohne Konto lesbar, Bilder direkt von den Nachrichtenseiten).
2. Kurzbericht an Telegram schicken. Nur EINE URL im Text, nämlich die Telegraph-Seite, damit Telegram
   dafür die Vorschau mit Instant View zeigt. Den claude.ai-Link NICHT in Telegram posten (Mitglieder können
   ihn nicht öffnen).

```bash
bash news/telegram.sh <<'MSG'
📰 Nachrichtenlage 19:00 Uhr (Dubai)

1. <Schlagzeile> ✅
2. <Schlagzeile> ✅
3. <Schlagzeile> ⚠️

18 Meldungen, 15 bestätigt
👉 Ganze Ausgabe mit Bildern: <Telegraph-URL>
MSG
```

- Stündlich: die 3 wichtigsten Schlagzeilen, Deutschland/VAE bevorzugt. Abendausgabe: Titel „🌙 Abendausgabe“,
  `intro` als Text, die 5 wichtigsten Schlagzeilen und der Link.
- Status-Zeichen: ✅ bestätigt, ⚠️ unbestätigt, ❗ widersprüchlich.
- Schlägt `telegraph.mjs` fehl: Kurzbericht ohne Link senden und den Fehler im Abschlussbericht nennen.
- Das Skript sendet nur, wenn `TELEGRAM_BOT_TOKEN` gesetzt ist. Seine Ausgabe im Abschlussbericht nennen.

## Grenzen

- Nichts committen oder pushen. Die Ausgabe landet nur in der Artifact-Datenbank und ihrem Bilderspeicher.
- Fehlschlagende Feeds aus `status.json` als Lücke behandeln und per `WebSearch` abdecken.
