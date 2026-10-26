# Redaktionsanleitung Nachrichtenlage

Diese Anleitung steuert die geplanten Claude-Läufe, die aus den gesammelten Rohmeldungen
eine Ausgabe bauen. Sprache der Ausgabe: **Deutsch**. Zeitzone: **Asia/Dubai (UTC+4)**.

## Eingaben

- Rohmeldungen: `data/news/YYYY-MM-DD.jsonl` (Dateiname = Kalenderdatum Dubai), eine JSON-Zeile pro Meldung:
  `{source, feed, title, link, summary, published, collected}`.
  Gesammelt alle 20 Minuten per GitHub Action (`.github/workflows/news-collect.yml`).
- Feed-Zustand: `data/news/status.json` (welche Feeds zuletzt fehlschlugen).
- Vorher immer `git pull` auf dem Default-Branch, damit die neuesten Daten da sind.

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
  "stats": { "stories": 12, "raw": 87, "confirmed": 9 },
  "lead": { "title": "...", "summary": "...", "why": "...", "status": "bestätigt", "sources": [{ "name": "BBC", "url": "https://..." }] },
  "sections": [ { "name": "Weltpolitik", "stories": [ { "title": "...", "summary": "...", "why": "...", "status": "bestätigt|unbestätigt|widersprüchlich", "sources": [ { "name": "...", "url": "..." } ] } ] } ],
  "intro": "nur Abendausgabe: 3–5 Sätze, der Tag in Kürze",
  "outlook": ["nur Abendausgabe: was morgen wichtig wird, 3–5 Punkte"]
}
```

Ressorts (nur befüllte verwenden, in dieser Reihenfolge): Weltpolitik, Naher Osten & Golf,
Deutschland & Europa, Wirtschaft & Märkte, Unternehmen, Technologie & Sicherheit, Weitere Meldungen.

## Stündliche Ausgabe

1. Meldungen mit `collected` in den letzten 65 Minuten laden (heutige und gestrige Datei prüfen).
2. Gleiche Ereignisse über Quellen hinweg zusammenführen.
3. **Faktencheck**
   - `bestätigt`: mindestens 2 **unabhängige** Quellen berichten den Kern übereinstimmend.
     Mehrere Medien, die dieselbe Agenturmeldung (Reuters/AP/dpa/AFP) übernehmen, zählen als eine Quelle.
   - Hat ein Ereignis nur eine Feed-Quelle: per `WebSearch` nach einer zweiten Quelle suchen
     (Reuters, AP, dpa, Tagesschau, FAZ, Guardian, The National usw.). Gefunden → als Quelle aufnehmen.
   - Nicht gefunden → `unbestätigt`. Abweichende Kernfakten (Zahlen, Täter, Ort) → `widersprüchlich`,
     und im `summary` benennen, wer was sagt.
4. **Paywall/kurzer Text** (v. a. Handelsblatt): Nur Titel/Teaser vorhanden → Inhalt per
   `WebSearch` aus frei zugänglichen Quellen füllen und diese als Quellen angeben.
   Nie Inhalte erfinden oder aus dem Titel extrapolieren.
5. Auswahl: 8–15 Meldungen, relevanteste zuerst. `lead` = wichtigste Meldung der Stunde.
   Keine Wiederholung aus der Vorstunde, außer es gibt neue Entwicklungen (dann im Titel kennzeichnen).
   Die Vorstunde mit `ArtifactData` `get` auf die vorige Dokument-ID prüfen.
6. `summary`: 2–3 sachliche Sätze. `why`: 1 Satz Einordnung (Bedeutung für Wirtschaft, Sicherheit,
   Golfregion oder Deutschland). Wertende Sprache der Quellen nicht übernehmen.
7. Gibt es in der Stunde keine neuen Meldungen: trotzdem eine kurze Ausgabe mit den wichtigsten
   laufenden Themen schreiben und das in `lead.summary` sagen.
8. Dokument mit `ArtifactData` `set` schreiben. Existiert die Dokument-ID schon (Wiederholungslauf),
   vorher `get` und mit `if_version` überschreiben. `stats` muss zu den tatsächlich geschriebenen
   Meldungen passen (`stories` = lead + alle Ressort-Meldungen). Fertig, keine weiteren Aktionen.

## Abendausgabe (23 Uhr)

- Grundlage: alle Rohmeldungen des Nachrichtentags plus die stündlichen Ausgaben des Tages
  (`ArtifactData` `query` auf `editions` mit `date == <date>`).
- 10–20 Meldungen über alle Ressorts, die den Tag geprägt haben, mit aktuellem Stand
  (spätere Entwicklungen ersetzen frühere). Gleicher Faktencheck.
- `intro` und `outlook` sind Pflicht.

## Grenzen

- Nichts committen oder pushen. Die Ausgabe landet nur in der Artifact-Datenbank.
- Fehlschlagende Feeds aus `status.json` als Lücke behandeln und per `WebSearch` abdecken.
