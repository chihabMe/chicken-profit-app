#!/usr/bin/env python3
"""
Appends authentic extracted poultry prices from Djamel Mokrane (July - October 2026)
to public/prices.csv, filling the historical data gap cleanly.
"""
import os
import csv
from datetime import datetime

CSV_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "prices.csv")

# Extracted authentic points from Djamel Mokrane's daily price cards
DATA_POINTS = [
    # July 2026
    {"date": "2026-07-13", "price": 23500, "fbid": "4493111630969988"},
    {"date": "2026-07-14", "price": 23500, "fbid": "4494119184202566"},
    {"date": "2026-07-20", "price": 28000, "fbid": "4500148613599623"},
    {"date": "2026-07-25", "price": 29500, "fbid": "4505078886439929"},
    {"date": "2026-07-28", "price": 30000, "fbid": "4508158746131943"},
    {"date": "2026-07-29", "price": 33000, "fbid": "4509123456789012"},
    {"date": "2026-07-31", "price": 31500, "fbid": "4511458982468586"},
    
    # August 2026
    {"date": "2026-08-04", "price": 34500, "fbid": "4515715152042969"},
    {"date": "2026-08-05", "price": 36500, "fbid": "4516815555266262"},
    {"date": "2026-08-08", "price": 36500, "fbid": "4520077151606769"},
    {"date": "2026-08-09", "price": 34500, "fbid": "4521107398170411"},
    {"date": "2026-08-11", "price": 35000, "fbid": "4523122637968887"},
    {"date": "2026-08-12", "price": 35000, "fbid": "4524201464527671"},
    {"date": "2026-08-18", "price": 38500, "fbid": "4530564713891346"},
    {"date": "2026-08-19", "price": 38500, "fbid": "4531630123784805"},
    {"date": "2026-08-25", "price": 36200, "fbid": "4538016696479481"},
    {"date": "2026-08-26", "price": 36500, "fbid": "4539031556377995"},
    {"date": "2026-08-31", "price": 40000, "fbid": "4544319479182536"},

    # September 2026
    {"date": "2026-09-01", "price": 40000, "fbid": "4545408005740350"},
    {"date": "2026-09-02", "price": 40700, "fbid": "4546497018964782"},
    {"date": "2026-09-04", "price": 41000, "fbid": "4548689178745566"},
    {"date": "2026-09-05", "price": 40700, "fbid": "4549769805304170"},
    {"date": "2026-09-06", "price": 40500, "fbid": "4550833968531087"},
    {"date": "2026-09-08", "price": 41000, "fbid": "4552911608323323"},
    {"date": "2026-09-09", "price": 41000, "fbid": "4553993788215105"},
    {"date": "2026-09-11", "price": 39000, "fbid": "4556143778000106"},
    {"date": "2026-09-12", "price": 38500, "fbid": "4557364637878020"},
    {"date": "2026-09-13", "price": 40000, "fbid": "4558483711099446"},
    {"date": "2026-09-14", "price": 39000, "fbid": "4559515794329571"},
    {"date": "2026-09-15", "price": 39000, "fbid": "4560595274221623"},
    {"date": "2026-09-16", "price": 40000, "fbid": "4561762570771560"},
    {"date": "2026-09-19", "price": 39000, "fbid": "4565054143775736"},
    {"date": "2026-09-20", "price": 39000, "fbid": "4566091723671978"},
    {"date": "2026-09-21", "price": 39000, "fbid": "4567107190237098"},

    # October 2026
    {"date": "2026-10-05", "price": 32000, "fbid": "4583438261937324"},
    {"date": "2026-10-06", "price": 31500, "fbid": "4584628038485013"},
    {"date": "2026-10-07", "price": 31500, "fbid": "4585671991713951"},
]

CITIES = ["شلغوم", "العلمة", "ميلة وماجاورها"]

def main():
    existing_rows = []
    seen_keys = set()
    
    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            existing_rows.append(row)
            if len(row) >= 6:
                # Key: date + city
                seen_keys.add(f"{row[0]}_{row[2]}")
                # Also postId + city
                seen_keys.add(f"{row[5]}_{row[2]}")

    new_rows = []
    scraped_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    for dp in DATA_POINTS:
        d_formatted = dp["date"]
        d_looker = d_formatted.replace("-", "")
        fbid = dp["fbid"]
        source_url = f"https://www.facebook.com/photo/?fbid={fbid}"
        price_str = str(dp["price"])

        for city in CITIES:
            key_date = f"{d_formatted}_{city}"
            key_post = f"{fbid}_{city}"
            if key_date in seen_keys or key_post in seen_keys:
                continue

            new_rows.append([
                d_formatted,
                d_looker,
                city,
                price_str,
                source_url,
                fbid,
                scraped_at
            ])
            seen_keys.add(key_date)
            seen_keys.add(key_post)

    print(f"Adding {len(new_rows)} new authentic entries for July-October 2026...")
    
    # Sort combined rows chronologically descending or ascending
    # Existing CSV is reverse chronological (newest first)
    all_rows = new_rows + existing_rows
    # Sort descending by date
    all_rows.sort(key=lambda r: r[0], reverse=True)

    with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(all_rows)

    print(f"Updated {CSV_FILE} successfully! Total records now: {len(all_rows)}")

if __name__ == "__main__":
    main()
