#!/usr/bin/env python3

from __future__ import annotations

import csv
import io
import json
import ssl
import sys
import time
import urllib.parse
import urllib.request
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

csv.field_size_limit(10_000_000)

SCHOOL_URL = "http://opendata.novo-sibirsk.ru/OpenDataDocuments/Data28/data-20260206T0109-structure-20260206T0109.CSV"
KINDERGARTEN_URL = "http://opendata.novo-sibirsk.ru/OpenDataDocuments/Data27/data-20260127T0154-structure-20260127T0154.CSV"
OUTPUT_PATH = Path("public/education/novosibirsk-education-snapshot.json")
CACHE_PATH = Path("/tmp/novosibirsk-education-geocode-cache.json")
GEOCODER_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "pilot-stand-sigma/education-snapshot (https://github.com/vadign/pilot-stand-sigma)"
REQUEST_DELAY_SECONDS = 1.0

STREET_TYPE_SUFFIXES = {
    "улица": "улица",
    "проспект": "проспект",
    "переулок": "переулок",
    "проезд": "проезд",
    "шоссе": "шоссе",
    "спуск": "спуск",
    "микрорайон": "микрорайон",
}

STREET_CANONICAL_OVERRIDES = {
    "В. Высоцкого улица": "Владимира Высоцкого улица",
}

MANUAL_COORDINATE_OVERRIDES = {
    json.dumps(["1-й 6-й Пятилетки переулок", "5/1", "Кировский район"], ensure_ascii=False): {
        "lat": 54.974633,
        "lon": 82.900783,
    },
}


@dataclass(frozen=True)
class SourceConfig:
    kind: str
    url: str
    email_key: str
    capacity_key: str | None
    hours_key: str


SOURCES = (
    SourceConfig(kind="school", url=SCHOOL_URL, email_key="Email", capacity_key=None, hours_key="Regimrab"),
    SourceConfig(kind="kindergarten", url=KINDERGARTEN_URL, email_key="E-mail", capacity_key="Mesta", hours_key="Regimraboti"),
)


def read_url(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with open_url(request) as response:
        return response.read().decode("utf-8-sig")


def open_url(request: urllib.request.Request):
    try:
        return urllib.request.urlopen(request, context=ssl.create_default_context())
    except urllib.error.URLError as error:
        reason = getattr(error, "reason", None)
        if isinstance(reason, ssl.SSLCertVerificationError):
            return urllib.request.urlopen(request, context=ssl._create_unverified_context())
        raise


def parse_csv(text: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(text))
    return [
        {key: (value or "").strip() for key, value in row.items()}
        for row in reader
        if any((value or "").strip() for value in row.values())
    ]


def normalize_street(street: str) -> str:
    street = STREET_CANONICAL_OVERRIDES.get(street, street)
    parts = street.split()
    if not parts:
        return street

    suffix = parts[-1].lower()
    if suffix not in STREET_TYPE_SUFFIXES:
        return street

    street_type = STREET_TYPE_SUFFIXES[suffix]
    street_name = " ".join(parts[:-1]).strip()
    return f"{street_type} {street_name}".strip()


def normalize_house(house: str) -> str:
    normalized = house.replace(" стр.", "").replace(" стр", "").strip()
    return " ".join(normalized.split())


def to_int(value: str) -> int | None:
    digits = "".join(ch for ch in value if ch.isdigit())
    return int(digits) if digits else None


def load_cache() -> dict[str, dict[str, float]]:
    if not CACHE_PATH.exists():
        return {}
    return json.loads(CACHE_PATH.read_text("utf-8"))


def save_cache(cache: dict[str, dict[str, float]]) -> None:
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), "utf-8")


def build_geocode_queries(street: str, house: str, district: str) -> Iterable[dict[str, str]]:
    normalized_house = normalize_house(house)
    normalized_street = normalize_street(street)
    yield {
        "format": "jsonv2",
        "limit": "1",
        "countrycodes": "ru",
        "q": f"{street}, {normalized_house}, Новосибирск, {district}",
    }
    yield {
        "format": "jsonv2",
        "limit": "1",
        "countrycodes": "ru",
        "q": f"{normalized_street}, {normalized_house}, Новосибирск, {district}",
    }
    yield {
        "format": "jsonv2",
        "limit": "1",
        "countrycodes": "ru",
        "city": "Новосибирск",
        "street": f"{normalized_house} {street}",
    }
    yield {
        "format": "jsonv2",
        "limit": "1",
        "countrycodes": "ru",
        "city": "Новосибирск",
        "street": f"{normalized_house} {normalized_street}",
    }
    yield {
        "format": "jsonv2",
        "limit": "1",
        "countrycodes": "ru",
        "q": f"Новосибирск, {street}, {normalized_house}, {district}",
    }
    yield {
        "format": "jsonv2",
        "limit": "1",
        "countrycodes": "ru",
        "q": f"{normalized_street}, {normalized_house}, Новосибирск",
    }


def geocode_address(street: str, house: str, district: str, cache: dict[str, dict[str, float]]) -> dict[str, float] | None:
    cache_key = json.dumps([street, house, district], ensure_ascii=False)
    if cache_key in MANUAL_COORDINATE_OVERRIDES:
        point = MANUAL_COORDINATE_OVERRIDES[cache_key]
        cache[cache_key] = point
        save_cache(cache)
        return point
    if cache_key in cache:
        return cache[cache_key]

    for params in build_geocode_queries(street, house, district):
        url = f"{GEOCODER_URL}?{urllib.parse.urlencode(params)}"
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        with open_url(request) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if payload:
            point = {
                "lat": round(float(payload[0]["lat"]), 6),
                "lon": round(float(payload[0]["lon"]), 6),
            }
            cache[cache_key] = point
            save_cache(cache)
            time.sleep(REQUEST_DELAY_SECONDS)
            return point
        time.sleep(REQUEST_DELAY_SECONDS)

    cache[cache_key] = None
    save_cache(cache)
    return None


def build_record(row: dict[str, str], source: SourceConfig, coordinates: dict[str, float] | None, index: int) -> dict[str, object]:
    street = row["AdrStreet"]
    house = row["AdrDom"]
    district = row["AdrDistr"]
    address = ", ".join(part for part in (f"{normalize_street(street)}", house, district, "Новосибирск") if part)
    return {
        "id": f"{source.kind}-{index + 1}",
        "kind": source.kind,
        "name": row["OuName"],
        "district": district,
        "street": street,
        "streetNormalized": normalize_street(street),
        "house": house,
        "address": address,
        "phone": row.get("Phone") or None,
        "site": row.get("Site") or None,
        "email": row.get(source.email_key) or None,
        "headName": row.get("RukName") or None,
        "headRole": row.get("RukPos") or None,
        "headPhone": row.get("RuckPhone") or row.get("Ruckphone") or None,
        "workingHours": row.get(source.hours_key) or None,
        "groups": row.get("Gruppy") or None,
        "capacity": to_int(row.get(source.capacity_key, "")) if source.capacity_key else None,
        "services": row.get("AdditionalServices") or row.get("Uslugi") or None,
        "additionalInfo": row.get("AdditionalInfo") or None,
        "equipment": row.get("Osnasch") or row.get("Osnachennost") or None,
        "specialists": row.get("Specialist") or None,
        "sports": row.get("Sport") or None,
        "coordinates": [coordinates["lat"], coordinates["lon"]] if coordinates else None,
    }


def main() -> int:
    cache = load_cache()
    institutions: list[dict[str, object]] = []
    source_meta: list[dict[str, object]] = []

    for source in SOURCES:
        print(f"[education] downloading {source.kind}: {source.url}", file=sys.stderr)
        rows = parse_csv(read_url(source.url))
        source_meta.append({"kind": source.kind, "url": source.url, "records": len(rows)})

        for index, row in enumerate(rows):
            coordinates = geocode_address(row["AdrStreet"], row["AdrDom"], row["AdrDistr"], cache)
            institutions.append(build_record(row, source, coordinates, index))
            if (index + 1) % 25 == 0:
                print(f"[education] {source.kind}: {index + 1}/{len(rows)}", file=sys.stderr)

    district_order = list(OrderedDict.fromkeys(item["district"] for item in institutions))
    geocoded_count = sum(1 for item in institutions if item["coordinates"])

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "city": "Новосибирск",
                "sourceType": "static-snapshot",
                "sourceUrls": source_meta,
                "districts": district_order,
                "counts": {
                    "schools": sum(1 for item in institutions if item["kind"] == "school"),
                    "kindergartens": sum(1 for item in institutions if item["kind"] == "kindergarten"),
                    "geocoded": geocoded_count,
                    "total": len(institutions),
                },
                "institutions": institutions,
            },
            ensure_ascii=False,
            indent=2,
        ),
        "utf-8",
    )
    print(f"[education] snapshot written: {OUTPUT_PATH} ({len(institutions)} institutions, {geocoded_count} geocoded)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
