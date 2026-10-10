#!/usr/bin/env python3
"""
Automated Verification Script: Multi-Horizon Statistical Correlation Engine (Python Standard Library)

Verifies multi-metric external price drivers (2022-2026) against authentic
Algerian wholesale poultry prices with zero external dependencies.

Usage: python3 scripts/verify_correlations.py
"""

import json
import math
import os
import sys
from typing import Dict, List, Tuple, Any

METRICS_META = [
    {"key": "soybeanMeal", "name": "Soybean Meal Futures", "symbol": "CBOT ZM=F", "unit": "USD/short ton", "category": "Feed Commodities"},
    {"key": "soybeans", "name": "Soybeans Futures", "symbol": "CBOT ZS=F", "unit": "US cents/bushel", "category": "Feed Commodities"},
    {"key": "corn", "name": "Corn (Maize) Futures", "symbol": "CBOT ZC=F", "unit": "US cents/bushel", "category": "Feed Commodities"},
    {"key": "wheat", "name": "Wheat Futures", "symbol": "CBOT ZW=F", "unit": "US cents/bushel", "category": "Feed Commodities"},
    {"key": "brentCrude", "name": "Brent Crude Oil", "symbol": "ICE BZ=F", "unit": "USD/barrel", "category": "Energy & Logistics"},
    {"key": "freightBdry", "name": "Breakwave Dry Bulk ETF", "symbol": "BDRY", "unit": "USD/share", "category": "Energy & Logistics"},
    {"key": "usdDzd", "name": "USD/DZD Official FX", "symbol": "DZD=X", "unit": "DZD/USD", "category": "Currency & Macro"},
    {"key": "eurDzd", "name": "EUR/DZD Official FX", "symbol": "EURDZD=X", "unit": "DZD/EUR", "category": "Currency & Macro"},
    {"key": "summerHeat", "name": "Summer Heat Max Temp", "symbol": "Open-Meteo", "unit": "°C (Chelghoum Laid)", "category": "Seasonality & Weather"},
    {"key": "eidAdhaProximity", "name": "Eid al-Adha Proximity", "symbol": "Hijri Calendar", "unit": "Index (0 to 1)", "category": "Calendar & Seasonality"},
]

LAGS = [0, 4, 8, 12, 16, 20, 24]

def mean(arr: List[float]) -> float:
    return sum(arr) / len(arr) if arr else 0.0

def std_dev(arr: List[float], m: float = None) -> float:
    if not arr:
        return 0.0
    if m is None:
        m = mean(arr)
    var = sum((x - m) ** 2 for x in arr) / len(arr)
    return math.sqrt(var)

def pearson(x: List[float], y: List[float]) -> float:
    if len(x) != len(y) or not x:
        return 0.0
    mx = mean(x)
    my = mean(y)
    sx = std_dev(x, mx)
    sy = std_dev(y, my)
    if sx == 0.0 or sy == 0.0:
        return 0.0
    cov = sum((x[i] - mx) * (y[i] - my) for i in range(len(x)))
    return cov / (len(x) * sx * sy)

def rank(arr: List[float]) -> List[float]:
    n = len(arr)
    indexed = sorted(enumerate(arr), key=lambda item: item[1])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and indexed[j + 1][1] == indexed[i][1]:
            j += 1
        avg_rank = (i + 1 + j + 1) / 2.0
        for k in range(i, j + 1):
            ranks[indexed[k][0]] = avg_rank
        i = j + 1
    return ranks

def spearman(x: List[float], y: List[float]) -> float:
    return pearson(rank(x), rank(y))

def evaluate_metrics(bundle: Dict[str, Any]) -> List[Dict[str, Any]]:
    algerian_prices = bundle["algerianPrices"]
    chicken_prices = [p["avgPriceDzd"] for p in algerian_prices]
    total_weeks = len(chicken_prices)

    evaluations = []

    for meta in METRICS_META:
        key = meta["key"]
        pts = bundle["metrics"][key]
        metric_by_week = {pt["isoWeek"]: pt["value"] for pt in pts}
        aligned_metric = [metric_by_week.get(p["isoWeek"], 0.0) for p in algerian_prices]

        lag_results = []
        optimal = None
        max_abs_r = -1.0

        for lag in LAGS:
            if lag >= total_weeks:
                continue
            x = aligned_metric[:len(aligned_metric) - lag]
            y = chicken_prices[lag:]
            r = pearson(x, y)
            rho = spearman(x, y)
            r2 = r * r

            res = {
                "lagWeeks": lag,
                "sampleSize": len(x),
                "pearsonR": round(r, 4),
                "spearmanRho": round(rho, 4),
                "r2": round(r2, 4),
            }
            lag_results.append(res)

            if abs(r) > max_abs_r:
                max_abs_r = abs(r)
                optimal = res

        optimal_lag = optimal if optimal is not None else lag_results[0]
        passes = abs(optimal_lag["pearsonR"]) >= 0.35 or optimal_lag["r2"] >= 0.12

        evaluations.append({
            "meta": meta,
            "lags": lag_results,
            "optimalLag": optimal_lag,
            "passesThreshold": passes,
        })

    evaluations.sort(key=lambda item: item["optimalLag"]["r2"], reverse=True)
    return evaluations

def print_report(evaluations: List[Dict[str, Any]], generated_at: str, period: str):
    print("=" * 92)
    print("  ALGERIAN POULTRY PRICE DRIVERS: MULTI-HORIZON CORRELATION VERIFICATION (PYTHON)")
    print("=" * 92)
    print(f"Dataset Period:   {period}")
    print(f"Bundle Timestamp: {generated_at}")
    print(f"Evaluation Run:   Pure Python Standard Library (math, statistics, json, csv)")
    print("-" * 92)

    print("\n### 1. SUMMARY RANKINGS TABLE (OPTIMAL HORIZONS)")
    print("-" * 92)
    hdr = (
        f"{'Rank':<5}"
        f"{'Candidate Metric':<28}"
        f"{'Category':<22}"
        f"{'Optimal Lag':<13}"
        f"{'Pearson r':<11}"
        f"{'Spearman ρ':<12}"
        f"{'R² (%)':<9}"
        f"Threshold"
    )
    print(hdr)
    print("-" * 92)

    for idx, item in enumerate(evaluations):
        opt = item["optimalLag"]
        meta = item["meta"]
        rank_str = f"#{idx + 1:<4}"
        name_str = f"{meta['name'][:26]:<28}"
        cat_str = f"{meta['category'][:20]:<22}"
        lag_str = f"{opt['lagWeeks']} wks (~{opt['lagWeeks'] / 4.3:.1f}m):<13"
        r_sign = "+" if opt["pearsonR"] >= 0 else ""
        r_str = f"{r_sign}{opt['pearsonR']:.4f}".ljust(11)
        rho_sign = "+" if opt["spearmanRho"] >= 0 else ""
        rho_str = f"{rho_sign}{opt['spearmanRho']:.4f}".ljust(12)
        r2_str = f"{opt['r2'] * 100:.2f}%".ljust(9)
        thresh_str = "PASS (|r|>=0.35)" if item["passesThreshold"] else "Below limit"

        print(f"{rank_str}{name_str}{cat_str}{lag_str[:13]}{r_str}{rho_str}{r2_str}{thresh_str}")
    print("-" * 92)

    print("\n### 2. DETAILED MULTI-HORIZON CORRELATION MATRIX (Lags 0 to 24 Weeks)")
    print("-" * 92)
    print(
        f"{'Metric / Symbol':<28}"
        f"{'Lag 0w':<9}"
        f"{'Lag 4w':<9}"
        f"{'Lag 8w':<9}"
        f"{'Lag 12w':<9}"
        f"{'Lag 16w':<9}"
        f"{'Lag 20w':<9}"
        f"{'Lag 24w':<9}"
    )
    print("-" * 92)

    for item in evaluations:
        meta = item["meta"]
        header = f"{meta['name']} ({meta['symbol']})"[:26].ljust(28)
        cols = ""
        for lag in item["lags"]:
            sign = "+" if lag["pearsonR"] >= 0 else ""
            cols += f"{sign}{lag['pearsonR']:.3f}".ljust(9)
        print(f"{header}{cols}")
    print("-" * 92)

    # Acceptance Criteria Verification
    soy_meal = next((e for e in evaluations if e["meta"]["key"] == "soybeanMeal"), None)
    if not soy_meal:
        print("FAIL: Soybean Meal (ZM=F) not found.")
        sys.exit(1)

    lag16 = next((l for l in soy_meal["lags"] if l["lagWeeks"] == 16), None)
    if not lag16:
        print("FAIL: 16-week lag not found for Soybean Meal.")
        sys.exit(1)

    print("\n### 3. ACCEPTANCE CRITERIA EMPIRICAL VALIDATION")
    print("-" * 92)
    print(f"Validated Metric:     Soybean Meal Futures ({soy_meal['meta']['symbol']})")
    print(f"Lead-Lag Horizon:     16 weeks (~3.7 to 4 months)")
    print(f"Sample Weeks (N):     {lag16['sampleSize']} mutual trading weeks")
    print(f"Empirical Pearson r:  {lag16['pearsonR']:.4f} (Expected: ~ +0.49)")
    print(f"Empirical Spearman ρ: {lag16['spearmanRho']:.4f} (Expected: ~ +0.47 - +0.50)")
    print(f"Empirical R²:         {lag16['r2'] * 100:.2f}% (Expected: ~ 24%)")
    print(f"Threshold Required:   |r| >= 0.35 OR R² >= 12%")

    passed = abs(lag16["pearsonR"]) >= 0.35 and lag16["r2"] >= 0.12
    if passed:
        print(f"Status:               SUCCESS - ACCEPTANCE CRITERIA SATISFIED")
        print("=" * 92)
        sys.exit(0)
    else:
        print(f"Status:               FAIL - Criteria not satisfied")
        print("=" * 92)
        sys.exit(1)

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bundle_path = os.path.join(root_dir, "public", "data", "external_metrics.json")

    if not os.path.exists(bundle_path):
        print(f"ERROR: Dataset bundle not found at {bundle_path}", file=sys.stderr)
        print("Run `npx tsx scripts/fetch_external_metrics.ts` to generate it.", file=sys.stderr)
        sys.exit(1)

    with open(bundle_path, "r", encoding="utf-8") as f:
        bundle = json.load(f)

    evaluations = evaluate_metrics(bundle)
    print_report(evaluations, bundle.get("generatedAt", "N/A"), bundle.get("metadata", {}).get("period", "N/A"))

if __name__ == "__main__":
    main()
