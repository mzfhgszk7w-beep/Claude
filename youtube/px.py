#!/usr/bin/env python3
"""P-X Travel: nimmt den naechsten Clip aus Google Drive, schneidet einen Short
(9:16, Musik, Ortsname) und laedt ihn auf YouTube hoch.

Umgebungsvariablen: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN,
DRIVE_FOLDER_ID, PRIVACY (private|public|unlisted), RECORD (true|false),
MAX_SECONDS (Standard 30), STATE_FILE (Standard youtube/state.json).
"""
import json, os, random, re, subprocess, sys, datetime, pathlib
import requests

API = "https://www.googleapis.com"
VIDEO_EXT = (".mp4", ".mov", ".m4v", ".mkv", ".avi")
AUDIO_EXT = (".mp3", ".m4a", ".wav", ".aac", ".ogg")

# Dateiname -> Land/Region. Woerter im Dateinamen, getrennt durch - oder _
PLACES = {
    "island": ("Iceland", "🇮🇸"), "iceland": ("Iceland", "🇮🇸"),
    "norwegen": ("Norway", "🇳🇴"), "norway": ("Norway", "🇳🇴"),
    "lofoten": ("Lofoten, Norway", "🇳🇴"), "senja": ("Senja, Norway", "🇳🇴"),
    "uae": ("UAE", "🇦🇪"), "vae": ("UAE", "🇦🇪"), "dubai": ("Dubai", "🇦🇪"),
    "abudhabi": ("Abu Dhabi", "🇦🇪"), "rak": ("Ras Al Khaimah", "🇦🇪"),
    "fujairah": ("Fujairah", "🇦🇪"), "oman": ("Oman", "🇴🇲"),
    "korea": ("South Korea", "🇰🇷"), "seoul": ("Seoul", "🇰🇷"), "busan": ("Busan", "🇰🇷"),
    "deutschland": ("Germany", "🇩🇪"), "germany": ("Germany", "🇩🇪"),
    "zypern": ("Cyprus", "🇨🇾"), "cyprus": ("Cyprus", "🇨🇾"),
    "schweiz": ("Switzerland", "🇨🇭"), "switzerland": ("Switzerland", "🇨🇭"),
    "italien": ("Italy", "🇮🇹"), "italy": ("Italy", "🇮🇹"),
    "spanien": ("Spain", "🇪🇸"), "spain": ("Spain", "🇪🇸"),
    "faroe": ("Faroe Islands", "🇫🇴"), "faroer": ("Faroe Islands", "🇫🇴"),
}
WORDS = {  # deutsche Begriffe ins Englische
    "wasserfall": "Waterfall", "vulkan": "Volcano", "lava": "Lava", "gletscher": "Glacier",
    "strand": "Beach", "meer": "Ocean", "kueste": "Coast", "küste": "Coast", "berg": "Mountain",
    "berge": "Mountains", "see": "Lake", "fluss": "River", "wueste": "Desert", "wüste": "Desert",
    "schlucht": "Canyon", "krater": "Crater", "strasse": "Road", "straße": "Road",
    "sonnenuntergang": "Sunset", "sonnenaufgang": "Sunrise", "stadt": "City", "insel": "Island",
    "fjord": "Fjord", "nordlicht": "Northern Lights", "schiff": "Shipwreck", "wrack": "Shipwreck",
}


def log(*a):
    print(*a, flush=True)


def token():
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": os.environ["YT_CLIENT_ID"],
        "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": os.environ["YT_REFRESH_TOKEN"],
        "grant_type": "refresh_token"}, timeout=30)
    if r.status_code != 200:
        sys.exit(f"Anmeldung fehlgeschlagen: {r.json().get('error')}")
    t = r.json()["access_token"]
    if os.environ.get("GITHUB_ACTIONS"):
        print(f"::add-mask::{t}")
    return t


def drive_list(tok, parent):
    files, page = [], None
    while True:
        p = {"q": f"'{parent}' in parents and trashed=false",
             "fields": "nextPageToken,files(id,name,mimeType,size)", "pageSize": 1000}
        if page:
            p["pageToken"] = page
        r = requests.get(f"{API}/drive/v3/files", params=p,
                         headers={"Authorization": f"Bearer {tok}"}, timeout=60)
        r.raise_for_status()
        j = r.json()
        files += j.get("files", [])
        page = j.get("nextPageToken")
        if not page:
            return files


def drive_download(tok, fid, dest):
    with requests.get(f"{API}/drive/v3/files/{fid}", params={"alt": "media"},
                      headers={"Authorization": f"Bearer {tok}"}, stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8 << 20):
                f.write(chunk)


def describe(filename):
    """island-fagradalsfjall-lava-01.mp4 -> ('Fagradalsfjall Lava', 'Iceland', '🇮🇸')"""
    stem = pathlib.Path(filename).stem.lower()
    words = [w for w in re.split(r"[-_\s.]+", stem) if w and not w.isdigit()
             and not re.fullmatch(r"(img|dji|mvi|vid|pxl|gx|dsc)\d*", w)]
    country, flag, rest = "", "", []
    for w in words:
        if w in PLACES and not country:
            country, flag = PLACES[w]
        else:
            rest.append(WORDS.get(w, w.capitalize()))
    return " ".join(rest), country, flag


def metadata(filename):
    rest, country, flag = describe(filename)
    place = rest or country or "Earth"
    if rest and country:
        title = f"{rest}, {country} from above {flag}"
    elif country:
        title = f"{country} from above {flag}"
    elif rest:
        title = f"{rest} from above"
    else:
        title = "Our planet from above"
    title = (title.strip() + " #shorts")[:100]
    ctag = re.sub(r"[^A-Za-z]", "", country.split(",")[0]) if country else ""
    hashtags = " ".join(f"#{h}" for h in [ctag, "drone", "travel", "aerial", "nature", "shorts"] if h)
    desc = (f"{place}{', ' + country if rest and country else ''} {flag}\n"
            f"Filmed from above by P-X Travel.\n\n"
            f"📸 Instagram: @p.x.mgmt\n"
            f"🔔 Subscribe for more aerial travel films.\n\n{hashtags}")
    tags = [t for t in [country, ctag, rest, "drone", "drone footage", "aerial", "travel",
                        "nature", "4k", "from above", "travel shorts"] if t]
    label = (rest or country or "").upper()
    return title, desc, tags, label


def probe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    return float(out.stdout.strip() or 0)


def render(clip, music, label, out, max_s=30.0):
    dur = min(probe_duration(clip), max_s)
    if dur < 3:
        raise ValueError(f"Clip zu kurz ({dur:.1f} s)")
    font = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    vf = ("scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,"
          f"fade=t=in:st=0:d=0.6,fade=t=out:st={dur - 0.8:.2f}:d=0.8")
    if label:
        pathlib.Path("label.txt").write_text(label, encoding="utf-8")
        size = max(36, min(64, int(980 / (0.72 * len(label)))))
        vf += (f",drawtext=fontfile={font}:textfile=label.txt:fontcolor=white:fontsize={size}:"
               "x=(w-text_w)/2:y=h*0.14:shadowcolor=black@0.7:shadowx=3:shadowy=3:"
               "alpha='if(lt(t,0.6),0,if(lt(t,3.6),1,max(0,1-(t-3.6))))'")
    vf += ",format=yuv420p"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", clip]
    if music:
        cmd += ["-stream_loop", "-1", "-i", music]
    cmd += ["-t", f"{dur:.2f}", "-vf", vf, "-map", "0:v:0"]
    if music:
        cmd += ["-map", "1:a:0", "-af",
                f"afade=t=in:d=0.5,afade=t=out:st={dur - 1.5:.2f}:d=1.5,volume=0.9",
                "-c:a", "aac", "-b:a", "192k"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    return dur


def upload(tok, path, title, desc, tags, privacy):
    body = {"snippet": {"title": title, "description": desc, "tags": tags, "categoryId": "19",
                        "defaultLanguage": "en", "defaultAudioLanguage": "zxx"},
            "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False,
                       "containsSyntheticMedia": False}}
    size = os.path.getsize(path)
    r = requests.post(f"{API}/upload/youtube/v3/videos",
                      params={"uploadType": "resumable", "part": "snippet,status"},
                      headers={"Authorization": f"Bearer {tok}",
                               "Content-Type": "application/json; charset=UTF-8",
                               "X-Upload-Content-Type": "video/mp4",
                               "X-Upload-Content-Length": str(size)},
                      data=json.dumps(body), timeout=60)
    if r.status_code != 200:
        sys.exit(f"Upload-Start fehlgeschlagen ({r.status_code}): {r.text[:500]}")
    with open(path, "rb") as f:
        r2 = requests.put(r.headers["Location"], data=f,
                          headers={"Content-Type": "video/mp4", "Content-Length": str(size)},
                          timeout=1800)
    if r2.status_code not in (200, 201):
        sys.exit(f"Upload fehlgeschlagen ({r2.status_code}): {r2.text[:500]}")
    return r2.json()


def main():
    folder = os.environ["DRIVE_FOLDER_ID"]
    privacy = os.environ.get("PRIVACY", "private")
    record = os.environ.get("RECORD", "false").lower() == "true"
    max_s = float(os.environ.get("MAX_SECONDS", "30"))
    state_file = pathlib.Path(os.environ.get("STATE_FILE", "youtube/state.json"))
    state = json.loads(state_file.read_text()) if state_file.exists() else {"done": {}}

    tok = token()
    sub = {f["name"].lower(): f["id"] for f in drive_list(tok, folder)
           if f["mimeType"] == "application/vnd.google-apps.folder"}
    if "clips" not in sub:
        sys.exit("Ordner 'clips' fehlt im Drive-Ordner.")
    clips = sorted([f for f in drive_list(tok, sub["clips"]) if f["name"].lower().endswith(VIDEO_EXT)],
                   key=lambda f: f["name"].lower())
    songs = [f for f in drive_list(tok, sub["musik"]) if f["name"].lower().endswith(AUDIO_EXT)] \
        if "musik" in sub else []
    todo = [c for c in clips if c["id"] not in state["done"]]
    log(f"Clips: {len(clips)} gesamt, {len(todo)} offen. Musiktitel: {len(songs)}.")
    if not todo:
        log("Keine neuen Clips. Bitte neue Videos in den Ordner 'clips' laden.")
        return

    clip = todo[0]
    title, desc, tags, label = metadata(clip["name"])
    log(f"Clip: {clip['name']} -> Titel: {title}")
    ext = pathlib.Path(clip["name"]).suffix.lower()
    drive_download(tok, clip["id"], "in" + ext)
    music = None
    if songs:
        song = random.choice(songs)
        music = "music" + pathlib.Path(song["name"]).suffix.lower()
        drive_download(tok, song["id"], music)
        log(f"Musik: {song['name']}")
    else:
        log("Hinweis: keine Musik im Ordner 'musik', Video ohne Ton.")
    dur = render("in" + ext, music, label, "short.mp4", max_s)
    log(f"Gerendert: {dur:.1f} s, {os.path.getsize('short.mp4') / 1e6:.1f} MB")

    tok = token()  # frischer Token fuer den Upload
    v = upload(tok, "short.mp4", title, desc, tags, privacy)
    url = f"https://youtu.be/{v['id']}"
    log(f"Hochgeladen: {url} (Status: {v['status']['privacyStatus']})")

    if record:
        state["done"][clip["id"]] = {"name": clip["name"], "video": v["id"],
                                     "date": datetime.datetime.utcnow().strftime("%Y-%m-%d")}
        state_file.parent.mkdir(parents=True, exist_ok=True)
        state_file.write_text(json.dumps(state, indent=1, ensure_ascii=False))
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as f:
            f.write(f"### ✅ Hochgeladen\n\n**{title}**\n\n{url} ({v['status']['privacyStatus']})\n\n"
                    f"Clip: `{clip['name']}`, {dur:.0f} s, Musik: {'ja' if music else 'nein'}\n")


if __name__ == "__main__":
    main()
