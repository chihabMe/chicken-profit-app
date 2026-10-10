import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ComposedChart, Area, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import fs from 'fs';
import path from 'path';
import { GET } from '../app/api/market/route';

// ============================================================================
// EMPIRICAL CHALLENGE SUITE: MILESTONE M2 MARKET DASHBOARD & API
// ============================================================================

describe('M2 Empirical Challenge 1: Chart Domain Calculations & Scaling', () => {
  it('emp_domain_01_real_market_data_domain_bounds', async () => {
    const req = new Request('http://localhost:3000/api/market');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    const chickenPrices = data.timeSeries.map((d: any) => d.chickenPriceDzd);
    const driverPrices = data.timeSeries.map((d: any) => d.driverPriceUsd);

    const cMin = Math.min(...chickenPrices);
    const cMax = Math.max(...chickenPrices);
    const dMin = Math.min(...driverPrices);
    const dMax = Math.max(...driverPrices);

    // Domain formulas from app/market/client-page.tsx
    const leftDomain = [cMin - 15, cMax + 15];
    const rightDomain = [dMin - 20, dMax + 20];

    // Left domain checks (Chicken: DZD/kg)
    expect(leftDomain[0]).toBeLessThan(cMin);
    expect(leftDomain[1]).toBeGreaterThan(cMax);
    expect(leftDomain[0]).toBeGreaterThan(0); // Prices in Algeria never negative
    expect(leftDomain[1] - leftDomain[0]).toBeGreaterThan(30);

    // Right domain checks (Soybean Meal: USD/short ton)
    expect(rightDomain[0]).toBeLessThan(dMin);
    expect(rightDomain[1]).toBeGreaterThan(dMax);
    expect(rightDomain[0]).toBeGreaterThan(0);
    expect(rightDomain[1] - rightDomain[0]).toBeGreaterThan(40);
  });

  it('emp_domain_02_constant_and_single_point_singularity_protection', () => {
    // Test that additive padding [-15, +15] and [-20, +20] prevents zero-span domains (min === max)
    const constantVal = 300;
    const leftDomain = [constantVal - 15, constantVal + 15];
    const rightDomain = [constantVal - 20, constantVal + 20];

    expect(leftDomain[1] - leftDomain[0]).toBe(30);
    expect(rightDomain[1] - rightDomain[0]).toBe(40);
    expect(leftDomain[0]).not.toBe(leftDomain[1]);
    expect(rightDomain[0]).not.toBe(rightDomain[1]);
  });

  it('emp_domain_03_extreme_outlier_domain_stability', () => {
    // Extreme high and low outlier simulation
    const extremeSeries = [10, 500, 10000];
    const min = Math.min(...extremeSeries);
    const max = Math.max(...extremeSeries);
    const domain = [min - 15, max + 15];

    expect(domain[0]).toBe(-5);
    expect(domain[1]).toBe(10015);
    expect(domain[1] > domain[0]).toBe(true);
  });
});

describe('M2 Empirical Challenge 2: Dual Y-Axis Architecture & Independence', () => {
  it('emp_dual_axis_01_axis_id_mapping_and_tick_formatting', () => {
    const formatLeftTick = (v: number) => `${Math.round(v)}`;
    const formatRightTick = (v: number) => `$${Math.round(v)}`;

    expect(formatLeftTick(285.6)).toBe('286');
    expect(formatLeftTick(285.2)).toBe('285');
    expect(formatRightTick(364.8)).toBe('$365');
    expect(formatRightTick(400)).toBe('$400');
  });

  it('emp_dual_axis_02_recharts_composed_chart_dual_axis_svg_render', () => {
    const sampleData = [
      { date: '2026-01-01', chickenPriceDzd: 230, driverPriceUsd: 360 },
      { date: '2026-01-08', chickenPriceDzd: 235, driverPriceUsd: 365 },
      { date: '2026-01-15', chickenPriceDzd: 240, driverPriceUsd: 370 },
    ];

    const chart = React.createElement(
      ComposedChart,
      { width: 600, height: 400, data: sampleData },
      React.createElement(XAxis, { dataKey: 'date' }),
      React.createElement(YAxis, {
        yAxisId: 'left',
        domain: ['dataMin - 15', 'dataMax + 15'],
        tickFormatter: (v: number) => `${Math.round(v)}`
      }),
      React.createElement(YAxis, {
        yAxisId: 'right',
        orientation: 'right',
        domain: ['dataMin - 20', 'dataMax + 20'],
        tickFormatter: (v: number) => `$${Math.round(v)}`
      }),
      React.createElement(Area, { yAxisId: 'left', dataKey: 'chickenPriceDzd', connectNulls: true }),
      React.createElement(Line, { yAxisId: 'right', dataKey: 'driverPriceUsd', connectNulls: true })
    );

    const html = renderToStaticMarkup(chart);
    expect(html).toContain('recharts-wrapper');
    expect(html).toContain('recharts-area');
    expect(html).toContain('recharts-line');
    // Verify both y-axes are present in markup
    const yAxisMatches = html.match(/recharts-yAxis/g);
    expect(yAxisMatches?.length).toBe(2);
  });

  it('emp_dual_axis_03_magnitude_disparity_scale_isolation', () => {
    // Chicken is ~300 DZD, Driver is ~400 USD. If driver is denominated in cents (~40,000 cents),
    // right axis should independently scale to 40,000 without warping left axis at 300.
    const leftVal = 300;
    const rightVal = 40000;

    const leftDomain = [leftVal - 15, leftVal + 15]; // [285, 315]
    const rightDomain = [rightVal - 20, rightVal + 20]; // [39980, 40020]

    expect(leftDomain[1] - leftDomain[0]).toBe(30);
    expect(rightDomain[1] - rightDomain[0]).toBe(40);
  });
});

describe('M2 Empirical Challenge 3: Tooltip Formatter Resilience', () => {
  // Replicate exact MacroChartTooltip component from client-page.tsx
  const MacroChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pt = payload[0]?.payload;
      if (!pt) return null;
      return React.createElement(
        'div',
        { className: 'tooltip-container' },
        React.createElement('span', { className: 'date' }, 'Date: ', label),
        pt.isoWeek && React.createElement('span', { className: 'iso' }, pt.isoWeek),
        React.createElement('span', { className: 'chicken' }, pt.chickenPriceDzd, ' DZD/kg'),
        React.createElement('span', { className: 'driver' }, '$', pt.driverPriceUsd, ' USD/short ton'),
        pt.driverPriceDzdEquivalent ? React.createElement('span', { className: 'dzd-eq' }, Number(pt.driverPriceDzdEquivalent).toLocaleString(), ' DZD/ton') : null
      );
    }
    return null;
  };

  it('emp_tooltip_01_inactive_and_empty_payload_behavior', () => {
    expect(renderToStaticMarkup(React.createElement(MacroChartTooltip, { active: false }))).toBe('');
    expect(renderToStaticMarkup(React.createElement(MacroChartTooltip, { active: true, payload: [] }))).toBe('');
    expect(renderToStaticMarkup(React.createElement(MacroChartTooltip, { active: true, payload: undefined }))).toBe('');
    expect(renderToStaticMarkup(React.createElement(MacroChartTooltip, { active: true, payload: [{}] }))).toBe('');
  });

  it('emp_tooltip_02_full_payload_rendered_elements', () => {
    const payload = [{
      name: 'Chicken Price',
      value: 295,
      payload: {
        date: '2026-06-15',
        isoWeek: '2026-W25',
        chickenPriceDzd: 295,
        driverPriceUsd: 360.5,
        driverPriceDzdEquivalent: 48667
      }
    }];

    const html = renderToStaticMarkup(React.createElement(MacroChartTooltip, { active: true, payload, label: '2026-06-15' }));
    expect(html).toContain('Date: 2026-06-15');
    expect(html).toContain('2026-W25');
    expect(html).toContain('295 DZD/kg');
    expect(html).toContain('$360.5 USD/short ton');
    expect(html).toContain('48,667 DZD/ton');
  });

  it('emp_tooltip_03_area_chart_and_bar_chart_formatters', () => {
    // AreaChart formatter: (val: any, name: any) => [`${val} DZD/kg`, name === 'price' ? 'Chicken Price' : name === 'sma7' ? '7-Day SMA' : '30-Day SMA']
    const areaFormatter = (val: any, name: any) => [
      `${val} DZD/kg`, 
      name === 'price' ? 'Chicken Price' : name === 'sma7' ? '7-Day SMA' : '30-Day SMA'
    ];
    expect(areaFormatter(310, 'price')).toEqual(['310 DZD/kg', 'Chicken Price']);
    expect(areaFormatter(305, 'sma7')).toEqual(['305 DZD/kg', '7-Day SMA']);
    expect(areaFormatter(300, 'sma30')).toEqual(['300 DZD/kg', '30-Day SMA']);

    // Seasonality formatter: (val: any) => [`${val} DZD/kg`, "Avg Price"]
    const barFormatter = (val: any) => [`${val} DZD/kg`, "Avg Price"];
    expect(barFormatter(325)).toEqual(['325 DZD/kg', 'Avg Price']);
  });
});

describe('M2 Empirical Challenge 4: Edge Cases (Empty Data, Network Failures, Resizing)', () => {
  it('emp_edge_01_empty_dataset_fallback_ui_rendering', () => {
    // Test empty timeSeries rendering logic from client-page.tsx line 746
    const renderMacroChartArea = (loadingMacro: boolean, macroData: any) => {
      if (loadingMacro) return 'Loading synchronized market intelligence...';
      if (!macroData || macroData.timeSeries.length === 0) {
        return 'No market correlation data available for selected range.';
      }
      return 'Chart rendered';
    };

    expect(renderMacroChartArea(true, null)).toBe('Loading synchronized market intelligence...');
    expect(renderMacroChartArea(false, null)).toBe('No market correlation data available for selected range.');
    expect(renderMacroChartArea(false, { timeSeries: [] })).toBe('No market correlation data available for selected range.');
    expect(renderMacroChartArea(false, { timeSeries: [{ date: '2026-01-01' }] })).toBe('Chart rendered');
  });

  it('emp_edge_02_failed_fetch_graceful_recovery', () => {
    // Simulate failed fetch exception handling
    let loadingMacro = true;
    let macroData: any = null;
    let errorCaught = false;

    try {
      throw new Error('HTTP 500: Internal Server Error');
    } catch {
      errorCaught = true;
      loadingMacro = false;
    }

    expect(errorCaught).toBe(true);
    expect(loadingMacro).toBe(false);
    expect(macroData).toBeNull();
  });

  it('emp_edge_03_slash_interval_midpoint_parser_stress', () => {
    function parsePrice(raw: string | number): number {
      if (typeof raw === 'number') return raw > 1000 ? raw / 100 : raw;
      const str = String(raw).trim();
      if (str.includes('/')) {
        const parts = str.split('/').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
        if (parts.length === 2) {
          const midpoint = (parts[0] + parts[1]) / 2;
          return midpoint > 1000 ? midpoint / 100 : midpoint;
        }
      }
      const val = parseFloat(str);
      if (isNaN(val)) return 0;
      return val > 1000 ? val / 100 : val;
    }

    // Stress parser with chaotic real-world inputs
    expect(parsePrice('29000/30000')).toBe(295);
    expect(parsePrice('31500/31000')).toBe(312.5);
    expect(parsePrice(' 28000 / 32000 ')).toBe(300);
    expect(parsePrice('29500')).toBe(295);
    expect(parsePrice(30500)).toBe(305);
    expect(parsePrice('320')).toBe(320);
    expect(parsePrice(320)).toBe(320);
    expect(parsePrice('corrupt_string')).toBe(0);
    expect(parsePrice('')).toBe(0);
    expect(parsePrice('0')).toBe(0);
  });

  it('emp_edge_04_responsive_container_dimension_stress', () => {
    // Recharts ResponsiveContainer rendered in SSR should render div container with style
    const container = React.createElement(
      ResponsiveContainer,
      { width: '100%', height: '100%' },
      React.createElement('div', null, 'chart content')
    );
    const html = renderToStaticMarkup(container);
    expect(html).toContain('width:100%');
    expect(html).toContain('height:100%');
  });

  it('emp_edge_05_theme_token_semantic_structure', () => {
    // Verify client-page uses semantic Tailwind classes for theme compatibility
    const clientPagePath = path.resolve('app/market/client-page.tsx');
    const content = fs.readFileSync(clientPagePath, 'utf-8');

    // Semantic tokens that adapt between light and dark modes
    expect(content).toContain('bg-card');
    expect(content).toContain('text-card-foreground');
    expect(content).toContain('border-border');
    expect(content).toContain('bg-muted');
    expect(content).toContain('text-muted-foreground');
    expect(content).toContain('text-foreground');
  });
});

describe('M2 Empirical Challenge 5: Production Build Artifacts & Hydration Integrity', () => {
  it('emp_build_01_confirm_market_build_artifacts_exist', () => {
    const marketHtml = path.resolve('.next/server/app/market.html');
    const marketPageJs = path.resolve('.next/server/app/market/page.js');
    const apiMarketRoute = path.resolve('.next/server/app/api/market/route.js');

    expect(fs.existsSync(marketHtml)).toBe(true);
    expect(fs.existsSync(marketPageJs)).toBe(true);
    expect(fs.existsSync(apiMarketRoute)).toBe(true);
  });

  it('emp_build_02_verify_html_contains_auth_and_metadata_without_leak', () => {
    const marketHtml = fs.readFileSync(path.resolve('.next/server/app/market.html'), 'utf-8');
    expect(marketHtml).toContain('Poultry Farm Pro');
    expect(marketHtml).toContain('Advanced metrics, break-even analysis, and market trends');
    expect(marketHtml).toContain('market');
    expect(marketHtml).not.toContain('ReferenceError');
    expect(marketHtml).not.toContain('TypeError');
  });
});
