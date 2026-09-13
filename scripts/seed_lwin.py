"""Seed (or refresh) public.lwin_wine from the Liv-ex LWIN spreadsheet.

    python3 scripts/seed_lwin.py ~/Downloads/LWINdatabase.xlsx
    python3 scripts/seed_lwin.py --check        # mapping self-check, no network

Needs openpyxl (pip install openpyxl) and SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.
Rerunnable: upserts on lwin7 and removes codes Liv-ex has since combined or deleted.
LWIN is CC BY 4.0 (https://www.liv-ex.com/lwin/lwin-creative-commons/); the app shows the credit.
"""

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

KEEP_TYPES = {"Wine", "Fortified Wine"}
BATCH = 1000


def clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return None if text in ("", "NA") else text


def to_row(r, now):
    """One spreadsheet row (dict of column -> value) to a lwin_wine row, or None to skip."""
    if clean(r["STATUS"]) != "Live" or clean(r["TYPE"]) not in KEEP_TYPES:
        return None
    display = clean(r["DISPLAY_NAME"])
    name = clean(r["PRODUCER_NAME"])
    title = clean(r["PRODUCER_TITLE"])
    producer = f"{title} {name}" if title and name else name
    # WINE is often NA; the name then lives in DISPLAY_NAME after "Producer, ".
    rest = display.split(", ", 1)[1] if display and ", " in display else None
    return {
        "lwin7": f"{int(r['LWIN']):07d}",
        "display_name": display or producer,
        "producer": producer,
        "wine": clean(r["WINE"]) or rest,
        "country": clean(r["COUNTRY"]),
        "region": clean(r["REGION"]),
        "sub_region": clean(r["SUB_REGION"]),
        "colour": clean(r["COLOUR"]),
        "type": clean(r["SUB_TYPE"]),
        "updated_at": now,
    }


def check():
    now = "2026-01-01T00:00:00+00:00"
    base = {"STATUS": "Live", "TYPE": "Wine", "COUNTRY": "France", "REGION": "Burgundy",
            "SUB_REGION": "NA", "COLOUR": "Red", "SUB_TYPE": "Still"}
    dujac = to_row({**base, "LWIN": 1030484.0, "DISPLAY_NAME": "Domaine Dujac, Bonnes Mares Grand Cru",
                    "PRODUCER_TITLE": "Domaine", "PRODUCER_NAME": "Dujac", "WINE": "NA"}, now)
    assert dujac["lwin7"] == "1030484"
    assert dujac["producer"] == "Domaine Dujac"
    assert dujac["wine"] == "Bonnes Mares Grand Cru", "name falls back to DISPLAY_NAME"
    assert dujac["sub_region"] is None, "NA becomes null"
    caymus = to_row({**base, "LWIN": 1121724, "DISPLAY_NAME": "Caymus, Cabernet Sauvignon, Napa Valley",
                     "PRODUCER_TITLE": "NA", "PRODUCER_NAME": "Caymus", "WINE": "Cabernet Sauvignon"}, now)
    assert caymus["producer"] == "Caymus" and caymus["wine"] == "Cabernet Sauvignon"
    assert to_row({**base, "LWIN": 1, "STATUS": "Combined", "DISPLAY_NAME": "x", "PRODUCER_TITLE": "NA",
                   "PRODUCER_NAME": "x", "WINE": "x"}, now) is None, "retired codes skipped"
    assert to_row({**base, "LWIN": 2, "TYPE": "Spirit", "DISPLAY_NAME": "x", "PRODUCER_TITLE": "NA",
                   "PRODUCER_NAME": "x", "WINE": "x"}, now) is None, "spirits skipped"
    assert to_row({**base, "LWIN": 42, "DISPLAY_NAME": "x", "PRODUCER_TITLE": "NA", "PRODUCER_NAME": "x",
                   "WINE": "x"}, now)["lwin7"] == "0000042", "zero-padded"
    print("seed_lwin mapping: ok")


def env():
    values = {}
    for line in (Path(__file__).resolve().parent.parent / ".env").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip().strip("'\"")
    return values["SUPABASE_URL"].rstrip("/"), values["SUPABASE_SERVICE_ROLE_KEY"]


def request(method, url, key, body=None):
    req = urllib.request.Request(
        url,
        method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.status


def seed(path):
    import openpyxl

    base, key = env()
    now = datetime.now(timezone.utc).isoformat()
    sheet = openpyxl.load_workbook(path, read_only=True).worksheets[0]
    rows = sheet.iter_rows(values_only=True)
    header = next(rows)

    batch, kept, retired = [], 0, []
    for values in rows:
        r = dict(zip(header, values))
        row = to_row(r, now)
        if row is None:
            if clean(r["STATUS"]) != "Live" and r["LWIN"] is not None:
                retired.append(f"{int(r['LWIN']):07d}")
            continue
        batch.append(row)
        if len(batch) == BATCH:
            request("POST", f"{base}/rest/v1/lwin_wine?on_conflict=lwin7", key, batch)
            kept += len(batch)
            batch = []
            print(f"\r{kept} wines upserted", end="", flush=True)
    if batch:
        request("POST", f"{base}/rest/v1/lwin_wine?on_conflict=lwin7", key, batch)
        kept += len(batch)

    for i in range(0, len(retired), 200):
        codes = ",".join(retired[i : i + 200])
        request("DELETE", f"{base}/rest/v1/lwin_wine?lwin7=in.({codes})", key)
    print(f"\rDone: {kept} wines upserted, {len(retired)} retired codes removed.")


if __name__ == "__main__":
    if sys.argv[1:] == ["--check"]:
        check()
    elif len(sys.argv) == 2:
        seed(sys.argv[1])
    else:
        print(__doc__)
        sys.exit(1)
