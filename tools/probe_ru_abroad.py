"""Probe HyperCareer RU-abroad careers URLs and known public ATS boards.

The bot can only ingest public JSON/XML ATS (Greenhouse, Ashby, Lever, …).
A 200 on the marketing careers page is not enough — radar.mjs never renders JS.
"""
from __future__ import annotations

import csv
import json
import re
import ssl
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "companies_ru_abroad.csv"
UA = "jobs-radar (personal job monitor)"
CTX = ssl.create_default_context()
TIMEOUT = 20

ATS_API = {
    "gh": lambda s: f"https://boards-api.greenhouse.io/v1/boards/{s}/jobs?content=true",
    "greenhouse": lambda s: f"https://boards-api.greenhouse.io/v1/boards/{s}/jobs?content=true",
    "ashby": lambda s: f"https://api.ashbyhq.com/posting-api/job-board/{s}",
    "lever": lambda s: f"https://api.lever.co/v0/postings/{s}?mode=json",
    "rec": lambda s: f"https://{s}.recruitee.com/api/offers/",
    "recruitee": lambda s: f"https://{s}.recruitee.com/api/offers/",
    "wk": lambda s: f"https://apply.workable.com/api/v1/widget/accounts/{s}",
    "workable": lambda s: f"https://apply.workable.com/api/v1/widget/accounts/{s}",
    "sr": lambda s: f"https://api.smartrecruiters.com/v1/companies/{s}/postings?limit=10",
    "smartrecruiters": lambda s: f"https://api.smartrecruiters.com/v1/companies/{s}/postings?limit=10",
    "tt": lambda s: f"https://{s}.teamtailor.com/jobs.json",
    "teamtailor": lambda s: f"https://{s}.teamtailor.com/jobs.json",
}

SNIFF = [
    ("greenhouse", r"greenhouse\.io|boards-api\.greenhouse"),
    ("ashby", r"ashbyhq\.com"),
    ("lever", r"jobs\.lever\.co|api\.lever\.co"),
    ("workable", r"apply\.workable\.com"),
    ("recruitee", r"recruitee\.com"),
    ("smartrecruiters", r"smartrecruiters\.com"),
    ("teamtailor", r"teamtailor\.com"),
    ("personio", r"jobs\.personio\."),
    ("bamboohr", r"bamboohr\.com"),
    ("pinpoint", r"pinpointhq\.com"),
    ("workday", r"myworkdayjobs\.com"),
    ("breezy", r"breezy\.hr"),
    ("comeet", r"comeet\.com"),
    ("huntflow", r"huntflow\."),
    ("gupy", r"gupy\.io"),
    ("peopleforce", r"peopleforce\.io"),
    ("linkedin", r"linkedin\.com"),
    ("notion", r"notion\.site|notion\.so"),
]


def fetch(url: str) -> tuple[int, str, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=CTX) as r:
            body = r.read(80000)
            ctype = r.headers.get("content-type", "")
            return r.status, ctype, body.decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, "", ""
    except Exception as e:
        return 0, "", str(e)[:80]


def sniff(url: str, html: str) -> str:
    blob = f"{url}\n{html}".lower()
    for kind, pat in SNIFF:
        if re.search(pat, blob):
            return kind
    return ""


def parse_csv() -> list[dict]:
    rows = []
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    return rows


def split_ats(row: dict) -> list[tuple[str, str]]:
    ats = (row.get("ats") or "").strip()
    slug = (row.get("ats_slug") or "").strip()
    if not ats or not slug:
        return []
    kinds = ats.split("+")
    slugs = slug.split("+")
    if len(kinds) == 1 and len(slugs) > 1:
        slugs = slugs[:1]
    out = []
    for i, kind in enumerate(kinds):
        s = slugs[i] if i < len(slugs) else slugs[-1]
        out.append((kind.strip(), s.strip()))
    return out


def usable_url(url: str) -> bool:
    u = (url or "").strip()
    if not u or u.startswith("(") or "не найден" in u.lower():
        return False
    if not u.startswith("http"):
        return False
    return True


def main() -> None:
    rows = parse_csv()
    print(f"companies in csv: {len(rows)}")

    tasks = []
    for row in rows:
        name = row["name"]
        for kind, slug in split_ats(row):
            builder = ATS_API.get(kind)
            if not builder:
                tasks.append(("unknown_ats", name, kind, slug, None))
                continue
            tasks.append(("ats", name, kind, slug, builder(slug)))
        url = row.get("careers_url") or ""
        if usable_url(url):
            tasks.append(("page", name, "", "", url.split()[0]))
        elif not split_ats(row):
            tasks.append(("none", name, "", "", url))

    results = []

    def run(task):
        kind, name, ats, slug, url = task
        if kind in ("none", "unknown_ats") or not url:
            return {**dict(zip(("kind", "name", "ats", "slug", "url"), task)),
                    "http": None, "ok": False, "sniff": ats or "", "note": "no fetchable url"}
        t0 = time.time()
        http, ctype, body = fetch(url)
        sniffed = sniff(url, body)
        ok = 200 <= (http or 0) < 400
        jobs = None
        if kind == "ats" and ok:
            try:
                data = json.loads(body) if body.startswith("{") or body.startswith("[") else None
                if isinstance(data, dict):
                    jobs = len(data.get("jobs") or data.get("offers") or data.get("content")
                               or data.get("items") or [])
                    if jobs == 0 and "totalFound" in data:
                        jobs = data.get("totalFound")
                elif isinstance(data, list):
                    jobs = len(data)
            except Exception:
                jobs = None
        return {
            "kind": kind, "name": name, "ats": ats, "slug": slug, "url": url,
            "http": http, "ok": ok, "ctype": ctype[:40], "sniff": sniffed,
            "jobs": jobs, "ms": int((time.time() - t0) * 1000),
            "err": "" if ok else body[:80],
        }

    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(run, t) for t in tasks]
        for i, fut in enumerate(as_completed(futs), 1):
            results.append(fut.result())
            if i % 25 == 0:
                print(f"  probed {i}/{len(futs)}")

    by_name: dict[str, list] = {}
    for r in results:
        by_name.setdefault(r["name"], []).append(r)

    bot_ok = []
    page_only = []
    down = []
    no_url = []
    unknown_platform = []

    BOT_ATS = {"greenhouse", "gh", "ashby", "lever", "rec", "recruitee", "wk",
               "workable", "sr", "smartrecruiters", "tt", "teamtailor", "personio",
               "bamboohr", "pinpoint"}

    for name, rs in by_name.items():
        ats_hits = [x for x in rs if x["kind"] == "ats" and x["ok"]]
        page_hits = [x for x in rs if x["kind"] == "page" and x["ok"]]
        if ats_hits:
            bot_ok.append((name, ats_hits))
        elif any(x["kind"] == "none" for x in rs) and not page_hits:
            no_url.append(name)
        elif page_hits:
            sniffed = {x["sniff"] for x in page_hits if x["sniff"]}
            if sniffed & (BOT_ATS | {"greenhouse", "ashby"}):
                bot_ok.append((name, page_hits))
            elif sniffed & {"workday", "breezy", "comeet", "huntflow", "gupy",
                            "peopleforce", "linkedin", "notion"}:
                unknown_platform.append((name, sniffed, page_hits[0]["http"]))
            else:
                page_only.append((name, sniffed, page_hits[0]["http"], page_hits[0]["url"][:80]))
        else:
            down.append((name, rs[0].get("http"), rs[0].get("url", "")[:70], rs[0].get("err", "")))

    print("\n=== BOT CAN INGEST (public ATS the radar already speaks) ===")
    for name, hits in sorted(bot_ok, key=lambda x: x[0].lower()):
        bits = []
        for h in hits:
            jobs = f" jobs={h['jobs']}" if h.get("jobs") is not None else ""
            bits.append(f"{h['ats'] or h['sniff']}:{h.get('slug') or ''} HTTP {h['http']}{jobs}")
        print(f"  {name:28}  {'; '.join(bits)}")

    print(f"\n=== HTML CAREERS PAGE ONLY (bot cannot parse JS) — {len(page_only)} ===")
    for name, sniffed, http, url in sorted(page_only, key=lambda x: x[0].lower()):
        print(f"  {name:28}  HTTP {http}  sniff={','.join(sniffed) or '-'}  {url}")

    print(f"\n=== OTHER ATS (no adapter in radar) — {len(unknown_platform)} ===")
    for name, sniffed, http in sorted(unknown_platform, key=lambda x: x[0].lower()):
        print(f"  {name:28}  HTTP {http}  {','.join(sniffed)}")

    print(f"\n=== DOWN / ERROR — {len(down)} ===")
    for name, http, url, err in sorted(down, key=lambda x: x[0].lower()):
        print(f"  {name:28}  HTTP {http}  {url}  {err}")

    print(f"\n=== NO CAREERS URL — {len(no_url)} ===")
    for name in sorted(no_url, key=str.lower):
        print(f"  {name}")

    print("\n=== COUNTS ===")
    print(f"  companies                 {len(rows)}")
    print(f"  bot can ingest            {len(bot_ok)}")
    print(f"  html page only            {len(page_only)}")
    print(f"  other ats (workday/etc)   {len(unknown_platform)}")
    print(f"  down                      {len(down)}")
    print(f"  no url                    {len(no_url)}")


if __name__ == "__main__":
    main()
