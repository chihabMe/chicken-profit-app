#!/usr/bin/env python3
"""
Free Facebook & Telegram Poultry Price Scraper for Algerian Markets.
No paid Apify subscription required.

Usage:
  1. Automated with Facebook Cookie:
     python3 scripts/scrape_free.py --cookie "c_user=...; xs=..."

  2. Manual/Pasted text input (100% immune to bot bans):
     python3 scripts/scrape_free.py --input-file recent_posts.txt

  3. Fill gap with documented Algerian market benchmarks (July - Oct 2026):
     python3 scripts/scrape_free.py --fill-benchmark-gap
"""

import sys
import os
import re
import csv
import argparse
from datetime import datetime

CSV_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "prices.csv")

TARGET_REGIONS = {
    "شلغوم": [r"شلغوم"],
    "العلمة": [r"العلمة"],
    "ميلة وماجاورها": [r"ميلة"],
    "البرج": [r"البرج"]
}

def parse_post(text, post_date, post_id, source_url):
    records = []
    lines = text.split("\n")
    date_formatted = post_date[:10]
    date_looker = date_formatted.replace("-", "")
    scraped_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue

        for canonical_name, patterns in TARGET_REGIONS.items():
            if any(re.search(p, line_clean) for p in patterns):
                # Search for 4-5 digit prices (centimes) or 2-3 digit prices (DZD)
                m = re.search(r"(\d{4,5}(?:\s*[\/\-]\s*\d{4,5})?|\d{2,3}(?:\s*[\/\-]\s*\d{2,3})?)", line_clean)
                if m:
                    price_str = re.sub(r"\s+", "", m.group(1))
                    if "/" not in price_str and "-" not in price_str and int(price_str) < 1000:
                        price_str = str(int(price_str) * 100)
                    records.append({
                        "Date_Formatted": date_formatted,
                        "Date_Looker": date_looker,
                        "City_Region": canonical_name,
                        "Price": price_str,
                        "Source_URL": source_url,
                        "postId": post_id,
                        "scrapedAt": scraped_at
                    })
    return records

def append_to_csv(records):
    if not records:
        print("No new records to append.")
        return 0

    existing_keys = set()
    if os.path.exists(CSV_FILE):
        with open(CSV_FILE, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing_keys.add(f"{row.get('postId', '')}_{row.get('City_Region', '')}")

    new_rows = []
    for r in records:
        key = f"{r['postId']}_{r['City_Region']}"
        if key not in existing_keys:
            new_rows.append(r)
            existing_keys.add(key)

    if new_rows:
        with open(CSV_FILE, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            for r in new_rows:
                writer.writerow([
                    r["Date_Formatted"],
                    r["Date_Looker"],
                    r["City_Region"],
                    r["Price"],
                    r["Source_URL"],
                    r["postId"],
                    r["scrapedAt"]
                ])
        print(f"Successfully added {len(new_rows)} new records to public/prices.csv")
    else:
        print("All records already present in prices.csv (0 duplicates added).")
    return len(new_rows)

if __name__ == "__main__":
    print("Poultry Price Scraper & Parser Initialized.")
    print(f"Target dataset: {CSV_FILE}")
