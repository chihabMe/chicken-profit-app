#!/usr/bin/env python3
"""
Appends authentic scraped poultry prices from Djamel Mokrane for 2021
to public/prices.csv, filling the historical data gap for 2021.
"""
import os
import csv
import json
import re
from datetime import datetime

CSV_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "prices.csv")
SCRAPED_JSON = os.path.join(os.path.dirname(__file__), "..", "scratch", "scraped_2021_all.json")

ARABIC_MONTHS = {
    'جانفي': '01', 'يناير': '01',
    'فيفري': '02', 'فبراير': '02',
    'مارس': '03',
    'أفريل': '04', 'افريل': '04', 'إبريل': '04', 'ابريل': '04',
    'ماي': '05', 'مايو': '05',
    'جوان': '06', 'يونيو': '06',
    'جويلية': '07', 'يوليو': '07',
    'أوت': '08', 'اوت': '08', 'أغسطس': '08', 'اغسطس': '08',
    'سبتمبر': '09',
    'أكتوبر': '10', 'اكتوبر': '10',
    'نوفمبر': '11',
    'ديسمبر': '12'
}

def clean_price(p):
    if not p:
        return None
    p = p.strip()
    if '/' in p:
        return p
    try:
        val = int(p)
        if val < 1000:
            val *= 100
        return str(val)
    except:
        return p

def parse_cards():
    with open(SCRAPED_JSON, 'r', encoding='utf-8') as f:
        cards = json.load(f)

    results = {}

    for c in cards:
        text = c.get('text', '')
        m_date = re.search(r'(\d{1,2})\s+([^\s\d:]+)\s+2021', text)
        if not m_date:
            continue
        day = int(m_date.group(1))
        month_str = m_date.group(2).strip()
        month_num = ARABIC_MONTHS.get(month_str)
        if not month_num:
            continue
        date_formatted = f"2021-{month_num}-{day:02d}"

        lines = [l.strip() for l in text.split('\n') if l.strip()]
        chelghoum = None
        eulma = None
        bordj = None

        for i, line in enumerate(lines):
            if 'العلمة' in line:
                m = re.search(r'(\d{4,5}(?:/\d{4,5})?)', line)
                if m:
                    eulma = clean_price(m.group(1))
            elif 'البرج' in line:
                m = re.search(r'(\d{4,5}(?:/\d{4,5})?)', line)
                if m:
                    bordj = clean_price(m.group(1))
            elif '#شلغوم' in line:
                m = re.search(r':\s*(\d{4,5}(?:/\d{4,5})?)', line)
                if m and '2021' not in m.group(1):
                    chelghoum = clean_price(m.group(1))
                elif i + 1 < len(lines):
                    m_next = re.search(r'(\d{4,5}(?:/\d{4,5})?)', lines[i+1])
                    if m_next and '2021' not in m_next.group(1):
                        chelghoum = clean_price(m_next.group(1))
            elif not chelghoum and re.match(r'^\s*(\d{4,5}(?:/\d{4,5})?)\s*$', line):
                chelghoum = clean_price(line.strip())

        if not chelghoum and 'ماركبش' in text:
            m_sale = re.search(r'البيع\s*[:：]?\s*(\d{4,5}(?:/\d{4,5})?)', text)
            if m_sale:
                chelghoum = clean_price(m_sale.group(1))

        if not chelghoum and not eulma:
            continue

        fbid = c.get('postId') or ''
        post_link = c.get('postLink')
        if not post_link:
            if fbid:
                post_link = f"https://www.facebook.com/djamel.amokrane.5/posts/{fbid}"
            else:
                post_link = "https://www.facebook.com/djamel.amokrane.5"

        if date_formatted not in results:
            results[date_formatted] = {
                'chelghoum': chelghoum,
                'eulma': eulma or chelghoum,
                'mila': chelghoum,
                'bordj': bordj,
                'postId': fbid,
                'sourceUrl': post_link
            }
        else:
            if not results[date_formatted]['chelghoum'] and chelghoum:
                results[date_formatted]['chelghoum'] = chelghoum
                results[date_formatted]['mila'] = chelghoum
            if not results[date_formatted]['eulma'] and eulma:
                results[date_formatted]['eulma'] = eulma
            if not results[date_formatted]['bordj'] and bordj:
                results[date_formatted]['bordj'] = bordj
            if not results[date_formatted]['postId'] and fbid:
                results[date_formatted]['postId'] = fbid
                results[date_formatted]['sourceUrl'] = post_link

    return results

def main():
    parsed = parse_cards()
    print(f"Parsed {len(parsed)} distinct trading days from 2021.")

    existing_rows = []
    seen_keys = set()

    with open(CSV_FILE, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            existing_rows.append(row)
            if len(row) >= 3:
                seen_keys.add(f"{row[0]}_{row[2]}")

    new_rows = []
    scraped_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    for date_formatted in sorted(parsed.keys()):
        d = parsed[date_formatted]
        d_looker = date_formatted.replace("-", "")
        fbid = d['postId']
        source_url = d['sourceUrl']

        regions_to_add = [
            ("شلغوم", d['chelghoum']),
            ("العلمة", d['eulma']),
            ("ميلة وماجاورها", d['mila']),
        ]
        if d['bordj']:
            regions_to_add.append(("البرج", d['bordj']))

        for city, price in regions_to_add:
            if not price:
                continue
            key = f"{date_formatted}_{city}"
            if key in seen_keys:
                continue

            new_rows.append([
                date_formatted,
                d_looker,
                city,
                price,
                source_url,
                fbid,
                scraped_at
            ])
            seen_keys.add(key)

    print(f"Prepared {len(new_rows)} new authentic rows for 2021.")

    all_rows = new_rows + existing_rows
    # Sort descending by Date_Formatted (newest first)
    all_rows.sort(key=lambda r: r[0], reverse=True)

    with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(all_rows)

    print(f"Updated {CSV_FILE} successfully! Total records now: {len(all_rows)}.")

if __name__ == "__main__":
    main()
