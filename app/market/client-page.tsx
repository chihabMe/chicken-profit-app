"use client";
import { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  Line, BarChart, Bar
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, Activity, Target, Database, MapPin, Calendar, Layers, Download
} from 'lucide-react';
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PriceData {
  date: string;
  price: number;
  region: string;
}

function parsePrice(raw: string | number): number {
  if (typeof raw === 'number') {
    return raw > 1000 ? raw / 100 : raw;
  }
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

const VALID_REGIONS = ['شلغوم', 'العلمة', 'ميلة وماجاورها', 'البرج'] as const;

function normalizeRegion(raw: string): string {
  if (!raw) return 'Unknown';
  const clean = raw.trim();
  if (clean.includes('شلغوم')) return 'شلغوم';
  if (clean.includes('العلمة')) return 'العلمة';
  if (clean.includes('ميلة')) return 'ميلة وماجاورها';
  if (clean.includes('البرج')) return 'البرج';
  return 'Unknown';
}

const App = () => {
  const { data: _session } = useSession();
  const [rawPriceData, setRawPriceData] = useState<PriceData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Active filters
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('6m'); // '1m', '3m', '6m', '1y', 'all'
  const [smaPeriod, setSmaPeriod] = useState<number>(7); // 0 (None), 7, 30

  // Load local chicken prices CSV
  useEffect(() => {
    fetch('/prices.csv')
      .then(res => res.text())
      .then(csv => {
        const lines = csv.split('\n').slice(1);
        const parsedList: PriceData[] = [];
        
        lines.forEach(line => {
          if (!line.trim()) return;
          const cols = line.split(',');
          if (cols.length >= 4) {
            const date = cols[0]?.trim();
            const region = normalizeRegion(cols[2] || '');
            const price = parsePrice(cols[3]);
            if (date && price > 0) {
              parsedList.push({ date, region, price });
            }
          }
        });

        // Sort chronologically
        parsedList.sort((a, b) => a.date.localeCompare(b.date));
        setRawPriceData(parsedList);
        setLoadingData(false);
      })
      .catch(err => {
        console.error("Error loading CSV:", err);
        toast.error("Failed to load historical price database");
        setLoadingData(false);
      });
  }, []);

  // Unique valid regions
  const regions = useMemo(() => {
    return ['All', ...VALID_REGIONS];
  }, []);

  // 1. Filtered individual price records based on active region & timeframe
  const filteredRecords = useMemo(() => {
    if (rawPriceData.length === 0) return [];
    
    let filtered = rawPriceData;
    
    // Filter by Region
    if (selectedRegion !== 'All') {
      filtered = filtered.filter(d => d.region === selectedRegion);
    }
    
    // Filter by Timeframe
    if (selectedTimeframe !== 'all') {
      const cutoffDate = new Date();
      if (selectedTimeframe === '1m') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      else if (selectedTimeframe === '3m') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
      else if (selectedTimeframe === '6m') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
      else if (selectedTimeframe === '1y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      
      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      filtered = filtered.filter(d => d.date >= cutoffStr);
    }
    
    return filtered;
  }, [rawPriceData, selectedRegion, selectedTimeframe]);

  // 2. Grouped local price data for the chart & SMAs
  const processedData = useMemo(() => {
    if (filteredRecords.length === 0) return [];
    
    // Group by Date (average price if multiple postings exist)
    const dateGroups: Record<string, number[]> = {};
    filteredRecords.forEach(item => {
      if (!dateGroups[item.date]) dateGroups[item.date] = [];
      dateGroups[item.date].push(item.price);
    });
    
    const sortedDates = Object.keys(dateGroups).sort();
    const result = sortedDates.map(date => {
      const prices = dateGroups[date];
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      return {
        date,
        price: Math.round(avgPrice),
      };
    });

    // Calculate SMAs
    return result.map((item, index, arr) => {
      const start7 = Math.max(0, index - 6);
      const slice7 = arr.slice(start7, index + 1);
      const sma7Value = slice7.reduce((sum, d) => sum + d.price, 0) / slice7.length;

      const start30 = Math.max(0, index - 29);
      const slice30 = arr.slice(start30, index + 1);
      const sma30Value = slice30.reduce((sum, d) => sum + d.price, 0) / slice30.length;

      return {
        ...item,
        sma7: Math.round(sma7Value),
        sma30: Math.round(sma30Value)
      };
    });
  }, [filteredRecords]);

  // Export filtered detailed records as CSV
  const handleDownloadCsv = () => {
    if (filteredRecords.length === 0) {
      toast.error("No price records to export for the selected filters");
      return;
    }

    const headers = ["Date", "Region", "Price (DZD/kg)"];
    const rows = filteredRecords.map(item => [
      item.date,
      `"${(item.region || '').replace(/"/g, '""')}"`,
      item.price
    ]);

    // Use UTF-8 BOM (\uFEFF) so Excel displays Arabic characters properly
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const regionSlug = selectedRegion === 'All' ? 'all_regions' : selectedRegion.replace(/\s+/g, '_');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute("download", `chicken_prices_${regionSlug}_${selectedTimeframe}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredRecords.length} records to CSV`);
  };

  // Analytics metrics
  const analytics = useMemo(() => {
    if (processedData.length === 0) {
      return { avg: 0, min: 0, max: 0, volatility: 0, current: 0, changePercent: 0 };
    }
    
    const prices = processedData.map(d => d.price);
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    // Volatility (Standard Deviation)
    const variance = prices.reduce((acc, p) => acc + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    const current = prices[prices.length - 1];
    const initialPrice = prices[0];
    const changePercent = initialPrice > 0 ? ((current - initialPrice) / initialPrice) * 100 : 0;
    
    return {
      avg: Math.round(avg),
      min,
      max,
      volatility: parseFloat(stdDev.toFixed(1)),
      current,
      changePercent: parseFloat(changePercent.toFixed(1))
    };
  }, [processedData]);

  // Seasonality by Day of Week
  const weeklySeasonality = useMemo(() => {
    if (processedData.length === 0) return [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const groups: Record<number, number[]> = {0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[]};
    
    processedData.forEach(d => {
      const dayNum = new Date(d.date).getDay();
      groups[dayNum].push(d.price);
    });
    
    return [1, 2, 3, 4, 5, 6, 0].map(dayNum => {
      const prices = groups[dayNum];
      const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      return {
        day: days[dayNum],
        price: Math.round(avg)
      };
    });
  }, [processedData]);

  // Regional stats compare table
  const regionalCompare = useMemo(() => {
    if (rawPriceData.length === 0) return [];
    
    const groups: Record<string, number[]> = {};
    rawPriceData.forEach(d => {
      const reg = d.region;
      if (reg === 'Unknown' || !reg || !VALID_REGIONS.includes(reg as any)) return;
      if (!groups[reg]) groups[reg] = [];
      groups[reg].push(d.price);
    });
    
    return Object.keys(groups).map(reg => {
      const prices = groups[reg];
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      return {
        region: reg,
        avg: Math.round(avg),
        min: Math.min(...prices),
        max: Math.max(...prices),
        records: prices.length
      };
    }).sort((a, b) => b.avg - a.avg);
  }, [rawPriceData]);

  return (
    <div className="flex flex-col gap-6 mt-4">

      {/* Overview Intro Box */}
      <div className="p-6 rounded-xl border border-border bg-gradient-to-br from-card to-primary/5 text-card-foreground shadow-xs flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2 text-foreground"><Database className="text-primary" size={24} /> Market Intelligence Dashboard</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">
            Real-time Algerian wholesale and farmgate live chicken price intelligence. Filter by provinces, identify optimal selling days with weekday seasonality, analyze 7-day and 30-day moving averages, and track market volatility.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Region Select */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Province / Market</span>
            <Select value={selectedRegion} onValueChange={(val) => setSelectedRegion(val || 'All')}>
              <SelectTrigger className="w-[170px] h-9 bg-input/40 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regions.map(r => (
                  <SelectItem key={r} value={r}>{r === 'All' ? '🇩🇿 All Regions' : r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Timeframe selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Timeframe</span>
            <div className="flex bg-muted p-0.5 rounded-lg border border-border h-9">
              {['1m', '3m', '6m', '1y', 'all'].map(t => (
                <button 
                  key={t}
                  onClick={() => setSelectedTimeframe(t)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold uppercase transition-all cursor-pointer ${selectedTimeframe === t ? 'bg-card text-card-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {/* Download CSV button */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Export Data</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCsv}
              disabled={loadingData || filteredRecords.length === 0}
              className="h-9 gap-1.5 text-xs font-semibold cursor-pointer border-border hover:bg-muted bg-input/40 px-3"
              title="Download filtered chicken price records as CSV"
            >
              <Download size={14} className="text-primary" />
              Download CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Local Price KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Current Price */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-purple-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={13} className="text-purple-500" /> Current Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-purple-500">
              {analytics.current} DZD
            </div>
            <div className="text-xs mt-1.5 font-medium">
              <span className={analytics.changePercent >= 0 ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
                {analytics.changePercent >= 0 ? '▲' : '▼'} {Math.abs(analytics.changePercent)}%
              </span>
              <span className="text-muted-foreground"> vs start</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Average Price */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-primary" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={13} className="text-primary" /> Average Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-foreground">
              {analytics.avg} DZD
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Median flock value
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Peak Price */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={13} className="text-emerald-500" /> Peak Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-emerald-500">
              {analytics.max} DZD
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Historical cycle maximum
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Floor Price */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-rose-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target size={13} className="text-rose-500" /> Floor Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-rose-500">
              {analytics.min} DZD
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Historical cycle floor
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Volatility */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-amber-500" /> Volatility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-amber-500">
              ± {analytics.volatility} DZD
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Std dev (price swings)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chicken Price Area Chart */}
      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <TrendingUp className="text-primary" size={18} /> Chicken Price Trend & Indicators
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Daily market averages with selectable moving average crossovers
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Layers size={14} /> Overlay:</span>
              <div className="flex bg-muted p-0.5 rounded-lg border border-border h-8">
                {[[0, 'None'], [7, '7d SMA'], [30, '30d SMA']].map(([val, label]) => (
                  <button 
                    key={val}
                    onClick={() => setSmaPeriod(Number(val))}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${smaPeriod === val ? 'bg-card text-card-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCsv}
              disabled={loadingData || filteredRecords.length === 0}
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
              title="Download filtered chicken price records as CSV"
            >
              <Download size={14} />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-[360px] pt-4">
          {loadingData ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart data...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={processedData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="chickenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} minTickGap={30} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(val: any, name: any) => [
                    `${val} DZD/kg`, 
                    name === 'price' ? 'Chicken Price' : name === 'sma7' ? '7-Day SMA' : '30-Day SMA'
                  ]}
                />
                <Area type="monotone" dataKey="price" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#chickenGrad)" />
                {smaPeriod === 7 && <Line type="monotone" dataKey="sma7" stroke="#10b981" strokeWidth={1.5} dot={false} />}
                {smaPeriod === 30 && <Line type="monotone" dataKey="sma30" stroke="#f59e0b" strokeWidth={1.5} dot={false} />}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Weekly patterns & Regional breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly seasonality bar chart */}
        <Card className="flex flex-col h-[350px] border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Calendar className="text-amber-500" size={16} /> Weekly Seasonality Profile
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Average price per day of week (identifies best selling days)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-2">
            {loadingData ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Loading seasonality...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySeasonality} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} domain={['dataMin - 10', 'dataMax + 5']} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(val: any) => [`${val} DZD/kg`, "Avg Price"]}
                  />
                  <Bar dataKey="price" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Regional performance comparison table */}
        <Card className="flex flex-col h-[350px] overflow-hidden border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <MapPin className="text-emerald-500" size={16} /> Regional Performance Matrix
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Compare average, peak, and floor prices across regional markets
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                    <th className="p-3">Region</th>
                    <th className="p-3 text-right">Avg Price</th>
                    <th className="p-3 text-right">Max</th>
                    <th className="p-3 text-right">Min</th>
                    <th className="p-3 text-right">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {regionalCompare.map((item, index) => (
                    <tr key={index} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3 font-medium text-foreground">{item.region}</td>
                      <td className="p-3 text-right font-semibold text-emerald-500">{item.avg} DZD</td>
                      <td className="p-3 text-right text-muted-foreground">{item.max} DZD</td>
                      <td className="p-3 text-right text-muted-foreground">{item.min} DZD</td>
                      <td className="p-3 text-right text-xs text-muted-foreground">{item.records}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default App;
