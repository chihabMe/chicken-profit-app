import json
import os
import re

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "scratch", "scraped_2020_all.json")

def merge_cards(new_cards):
    existing = []
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            existing = []

    seen = set()
    merged = []

    # Filter and deduplicate
    for c in existing + new_cards:
        text = c.get('text', '').strip()
        # Ensure it has 2020 and a price or poultry marker
        if '2020' not in text:
            continue
        # Deduplicate key: (postId if postId else text[:50])
        post_id = c.get('postId')
        key = post_id if post_id else text[:60]
        if key not in seen:
            seen.add(key)
            merged.append(c)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"Successfully saved {len(merged)} unique 2020 cards to {OUTPUT_FILE}.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            raw = f.read()
            start = raw.find('{')
            end = raw.rfind('}') + 1
            data = json.loads(raw[start:end])
            merge_cards(data.get('cards', []))
