"use client";
import { useState, useMemo, useEffect } from 'react';
import { 
  Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, ReferenceLine, PieChart, Pie, Cell, Legend, ComposedChart, Bar
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, Activity, CheckCircle2, Calculator, CalendarDays, 
  Database, Wheat, Target, Droplet, Syringe, LineChart as ChartIcon, LayoutDashboard, Save, LogIn, LogOut, FolderOpen, Printer, Download
} from 'lucide-react';

import { useSession, signIn, signOut } from "next-auth/react";
import { saveSimulation, getSimulations, createFlock, getFlocks, logFlockDaily, getFlockLogs } from "../actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";

interface PriceData {
  date: string;
  price: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const VACCINE_SCHEDULE = [
  { day: 1, action: 'Vitamins & Electrolytes (Water)' },
  { day: 7, action: 'Newcastle Disease (ND) + IB (Eye Drop/Water)' },
  { day: 14, action: 'Gumboro Disease (IBD) (Drinking Water)' },
  { day: 21, action: 'Newcastle Disease Booster (Drinking Water)' },
  { day: 24, action: 'Gumboro Booster (If high risk) (Drinking Water)' },
  { day: 35, action: 'Withdrawal of all medications/antibiotics' }
];

const App = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Custom Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'market' | 'logger'>('dashboard');

  // Flock Logger State
  const [flocks, setFlocks] = useState<any[]>([]);
  const [activeFlockId, setActiveFlockId] = useState<number | null>(null);
  const [flockLogs, setFlockLogs] = useState<any[]>([]);

  const [newFlockName, setNewFlockName] = useState('');
  const [newFlockChicks, setNewFlockChicks] = useState(1000);
  const [newFlockDate, setNewFlockDate] = useState(new Date().toISOString().split('T')[0]);

  const [logDay, setLogDay] = useState(1);
  const [logMortality, setLogMortality] = useState(0);
  const [logFeed, setLogFeed] = useState('0');
  const [logNotes, setLogNotes] = useState('');

  useEffect(() => {
    if (session && activeTab === 'logger') {
      getFlocks().then(setFlocks);
    }
  }, [session, activeTab]);

  useEffect(() => {
    if (activeFlockId) {
      getFlockLogs(activeFlockId).then(setFlockLogs);
    }
  }, [activeFlockId]);

  const handleCreateFlock = async () => {
    if (!newFlockName) return toast.error("Flock name required");
    await createFlock(newFlockName, newFlockChicks, newFlockDate);
    const updated = await getFlocks();
    setFlocks(updated);
    setNewFlockName('');
  };

  const handleLogDaily = async () => {
    if (!activeFlockId) return toast.error("Select a flock first");
    await logFlockDaily(activeFlockId, logDay, logMortality, logFeed, logNotes);
    const updatedLogs = await getFlockLogs(activeFlockId);
    setFlockLogs(updatedLogs);
    setLogDay(logDay + 1);
    setLogMortality(0);
    setLogFeed('0');
    setLogNotes('');
  };

  // Inputs: Basic
  const [chicksBought, setChicksBought] = useState(1000);
  const [mortalityRate, setMortalityRate] = useState(5); // %
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysToSell, setDaysToSell] = useState(45);
  const [avgWeight, setAvgWeight] = useState(2.5); // kg

  // Inputs: Costs
  const [chickCost, setChickCost] = useState(150); // DZD
  const [chickCostMode, setChickCostMode] = useState<'per-chick' | 'total'>('per-chick');
  const [feedConsumedPerChick, setFeedConsumedPerChick] = useState(3.8); // kg
  const [feedConsumedMode, setFeedConsumedMode] = useState<'per-chick' | 'total'>('per-chick');
  const [feedPricePerKg, setFeedPricePerKg] = useState(80); // DZD
  const [medicationCost, setMedicationCost] = useState(15); // DZD
  const [medicationCostMode, setMedicationCostMode] = useState<'per-chick' | 'total'>('per-chick');
  const [energyCost, setEnergyCost] = useState(20); // Heating/Electricity DZD
  const [energyCostMode, setEnergyCostMode] = useState<'per-chick' | 'total'>('per-chick');
  const [laborCostCycle, setLaborCostCycle] = useState(30000); // Total labor cost for the cycle DZD
  const [laborCostMode, setLaborCostMode] = useState<'per-chick' | 'total'>('total');
  
  // Historical Data State
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Load Saved Simulations
  useEffect(() => {
    if (session) {
      getSimulations().then(setSavedSimulations).catch(console.error);
    }
  }, [session]);

  const handleSaveScenario = async () => {
    if (!session) return;
    setScenarioName('');
    setIsSaveModalOpen(true);
  };

  const confirmSaveScenario = async () => {
    if (!scenarioName.trim()) {
      toast.error("Please enter a name for the scenario");
      return;
    }
    setIsSaving(true);
    const data = {
      chicksBought, mortalityRate, startDate, daysToSell, avgWeight,
      chickCost, chickCostMode, feedConsumedPerChick, feedConsumedMode,
      feedPricePerKg, medicationCost, medicationCostMode, energyCost, energyCostMode, 
      laborCostCycle, laborCostMode
    };

    try {
      await saveSimulation(scenarioName, data);
      const updated = await getSimulations();
      setSavedSimulations(updated);
      toast.success("Scenario saved successfully!");
      setIsSaveModalOpen(false);
    } catch (err) {
      toast.error("Failed to save scenario.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadScenarioValue = (value: string | null) => {
    if (!value) return;
    try {
      const simData = JSON.parse(value);
      setChicksBought(simData.chicksBought ?? 1000);
      setMortalityRate(simData.mortalityRate ?? 5);
      setStartDate(simData.startDate ?? new Date().toISOString().split('T')[0]);
      setDaysToSell(simData.daysToSell ?? 45);
      setAvgWeight(simData.avgWeight ?? 2.5);
      setChickCost(simData.chickCost ?? 150);
      setChickCostMode(simData.chickCostMode ?? (simData.inputMode === 'total' ? 'total' : 'per-chick'));
      setFeedConsumedPerChick(simData.feedConsumedPerChick ?? 3.8);
      setFeedConsumedMode(simData.feedConsumedMode ?? (simData.inputMode === 'total' ? 'total' : 'per-chick'));
      setFeedPricePerKg(simData.feedPricePerKg ?? 80);
      setMedicationCost(simData.medicationCost ?? 15);
      setMedicationCostMode(simData.medicationCostMode ?? (simData.inputMode === 'total' ? 'total' : 'per-chick'));
      setEnergyCost(simData.energyCost ?? 20);
      setEnergyCostMode(simData.energyCostMode ?? (simData.inputMode === 'total' ? 'total' : 'per-chick'));
      setLaborCostCycle(simData.laborCostCycle ?? 30000);
      setLaborCostMode(simData.laborCostMode ?? 'total');
      toast.success("Scenario loaded successfully!");
    } catch (e) {
      toast.error("Failed to load scenario.");
    }
  };

  // Dates calculation
  const sellDateObj = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + daysToSell);
    return d;
  }, [startDate, daysToSell]);
  
  const sellDateStr = useMemo(() => sellDateObj.toISOString().split('T')[0], [sellDateObj]);
  const endDateDisplay = useMemo(() => sellDateObj.toLocaleDateString('en-GB'), [sellDateObj]);

  // Load CSV Data
  useEffect(() => {
    fetch('/prices.csv')
      .then(res => res.text())
      .then(csv => {
        const lines = csv.split('\n').slice(1);
        const dataMap: Record<string, number[]> = {};
        
        lines.forEach(line => {
          if (!line.trim()) return;
          const cols = line.split(',');
          if (cols.length >= 4) {
            const date = cols[0];
            const priceRaw = parseInt(cols[3], 10);
            if (!isNaN(priceRaw)) {
              const price = priceRaw > 1000 ? priceRaw / 100 : priceRaw;
              if (!dataMap[date]) dataMap[date] = [];
              dataMap[date].push(price);
            }
          }
        });

        const sortedData: PriceData[] = Object.keys(dataMap).sort().map(date => {
          const avgPrice = dataMap[date].reduce((a, b) => a + b, 0) / dataMap[date].length;
          return { date, price: Math.round(avgPrice) };
        });

        setHistoricalData(sortedData);
        setLoadingData(false);
      })
      .catch(err => {
        console.error("Error loading CSV:", err);
        setLoadingData(false);
      });
  }, []);

  // Pricing
  const [manualSellingPrice, setManualSellingPrice] = useState<number | null>(null);
  
  const autoSellingPrice = useMemo(() => {
    if (historicalData.length === 0) return 250;
    const exactMatch = historicalData.find(d => d.date === sellDateStr);
    if (exactMatch) return exactMatch.price;
    const pastDates = historicalData.filter(d => d.date <= sellDateStr);
    if (pastDates.length > 0) return pastDates[pastDates.length - 1].price;
    return historicalData[historicalData.length - 1].price;
  }, [historicalData, sellDateStr]);

  const sellingPrice = manualSellingPrice !== null ? manualSellingPrice : autoSellingPrice;
  const isAutoPrice = manualSellingPrice === null;

  // Advanced Calculations
  const survivedChicks = useMemo(() => Math.floor(chicksBought * (1 - mortalityRate / 100)), [chicksBought, mortalityRate]);
  const totalMeatKg = useMemo(() => survivedChicks * avgWeight, [survivedChicks, avgWeight]);
  
  // Cost breakdown
  const totalChickCost = chickCostMode === 'per-chick' ? chicksBought * chickCost : chickCost;
  
  const totalFeedKg = feedConsumedMode === 'per-chick' 
    ? (survivedChicks * feedConsumedPerChick) + ((chicksBought - survivedChicks) * (feedConsumedPerChick / 2))
    : feedConsumedPerChick;
    
  const feedCostTotal = totalFeedKg * feedPricePerKg;
  
  const totalMedsCost = medicationCostMode === 'per-chick' ? chicksBought * medicationCost : medicationCost;
  const totalEnergyCost = energyCostMode === 'per-chick' ? chicksBought * energyCost : energyCost;
  const totalLaborCost = laborCostMode === 'per-chick' ? chicksBought * laborCostCycle : laborCostCycle;
  
  const totalCost = totalChickCost + feedCostTotal + totalMedsCost + totalEnergyCost + totalLaborCost;
  
  const totalRevenue = totalMeatKg * sellingPrice;
  const profit = totalRevenue - totalCost;
  
  // KPIs
  const roi = ((profit / totalCost) * 100).toFixed(1);
  const profitMargin = ((profit / totalRevenue) * 100).toFixed(1);
  const breakEvenPrice = totalCost / totalMeatKg;
  const fcr = totalFeedKg / totalMeatKg;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Parameter", "Value"],
      ["Starting Chicks", chicksBought],
      ["Mortality Rate (%)", mortalityRate],
      ["Start Date", startDate],
      ["Days to Sell", daysToSell],
      ["Avg Sale Weight (kg)", avgWeight],
      ["Input Mode", "Custom"],
      [`Chick Purchase Price (DZD)`, chickCost],
      [`Feed Consumed (kg)`, feedConsumedPerChick],
      ["Feed Price (DZD / kg)", feedPricePerKg],
      [`Meds/Vaccines (DZD)`, medicationCost],
      [`Energy (DZD)`, energyCost],
      ["Cycle Labor (DZD)", laborCostCycle],
      ["", ""],
      ["Metric", "Value"],
      ["Survived Chicks", survivedChicks],
      ["Total Meat Yield (kg)", totalMeatKg],
      ["Selling Price (DZD/kg)", sellingPrice],
      ["Total Expenses (DZD)", totalCost.toFixed(0)],
      ["Total Revenue (DZD)", totalRevenue.toFixed(0)],
      ["Net Profit (DZD)", profit.toFixed(0)],
      ["Profit Margin (%)", profitMargin],
      ["ROI (%)", roi],
      ["Break-Even Price (DZD/kg)", breakEvenPrice.toFixed(2)],
      ["FCR", fcr.toFixed(2)],
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `poultry-simulation-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart Data
  const costBreakdownData = [
    { name: 'Chicks', value: totalChickCost },
    { name: 'Feed', value: feedCostTotal },
    { name: 'Meds & Vaccines', value: totalMedsCost },
    { name: 'Energy', value: totalEnergyCost },
    { name: 'Labor', value: totalLaborCost },
  ];

  const sensitivityData = useMemo(() => {
    const data = [];
    const minPrice = Math.max(50, sellingPrice - 80);
    const maxPrice = sellingPrice + 80;
    for (let p = minPrice; p <= maxPrice; p += 10) {
      const pRevenue = totalMeatKg * p;
      data.push({ price: p, profit: pRevenue - totalCost });
    }
    return data;
  }, [sellingPrice, totalMeatKg, totalCost]);

  const resourceData = useMemo(() => {
    const data = [];
    
    // Determine the average feed per chick assuming normal growth pattern
    const feedPerChickBasis = feedConsumedMode === 'per-chick' 
      ? feedConsumedPerChick 
      : feedConsumedPerChick / (survivedChicks + (chicksBought - survivedChicks) * 0.5);

    for (let day = 1; day <= daysToSell; day++) {
      const growthFactor = Math.pow(day / daysToSell, 2);
      const dailyFeed = (feedPerChickBasis / daysToSell) * 0.5 + (growthFactor * 0.1); 
      const alive = chicksBought - ((chicksBought - survivedChicks) * (day / daysToSell));
      const k = 0.15;
      const midpoint = daysToSell * 0.55; 
      const expectedWeight = (avgWeight * 1.05) / (1 + Math.exp(-k * (day - midpoint)));

      data.push({
        day: `Day ${day}`,
        feedKg: Math.round(dailyFeed * alive),
        waterLiters: Math.round((dailyFeed * 2) * alive),
        weightGrams: Math.round(expectedWeight * 1000)
      });
    }
    return data;
  }, [daysToSell, feedConsumedPerChick, chicksBought, survivedChicks, avgWeight, feedConsumedMode]);

  const [macroMarketData, setMacroMarketData] = useState<any[]>([]);
  const [marketRange, setMarketRange] = useState(6);

  useEffect(() => {
    if (activeTab === 'market') {
      setLoadingData(true);
      fetch(`/api/market?months=${marketRange}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setMacroMarketData(data);
          setLoadingData(false);
        })
        .catch(() => setLoadingData(false));
    }
  }, [activeTab, marketRange]);
  const formatDZD = (num: number) => {
    return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(num);
  };

  if (status === "loading") {
    return null;
  }

  return (
    <>
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 border-b-2 border-primary pb-4">
        <h1 className="text-3xl font-extrabold text-foreground">Poultry Farm Pro — Profit Simulation Report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generated on {new Date().toLocaleDateString('en-GB')} | Flock Start: {new Date(startDate).toLocaleDateString('en-GB')}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-card border border-border rounded-xl shadow-xs mb-6 no-print">
        <div className="w-full sm:w-auto flex-1 max-w-md">
          <Select onValueChange={handleLoadScenarioValue}>
            <SelectTrigger className="w-full bg-input/40 h-10 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <FolderOpen size={16} />
                <SelectValue placeholder="Load Saved Scenario..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              {savedSimulations.map(sim => (
                <SelectItem key={sim.id} value={JSON.stringify(sim.data)}>
                  {sim.name} ({new Date(sim.createdAt).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap w-full sm:w-auto gap-2 justify-end">
          <Button onClick={handleSaveScenario}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
          >
            <Save size={16} /> Save Scenario
          </Button>
          <Button onClick={handlePrint}
            variant="outline"
            className="border-primary/30 hover:bg-primary/10 text-primary font-semibold flex items-center gap-2"
          >
            <Printer size={16} /> Print / Save PDF
          </Button>
          <Button onClick={handleExportCSV}
            variant="outline"
            className="border-border hover:bg-accent flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Print-only Parameters Summary */}
      <div className="hidden print:grid grid-cols-2 gap-6 border rounded-xl p-6 bg-muted/10 mb-8 page-break-inside-avoid">
        <div>
          <h3 className="font-bold border-b pb-2 mb-3">Flock Details & Timeline</h3>
          <div className="flex justify-between py-1 text-sm"><span>Starting Chicks:</span><span className="font-semibold">{chicksBought.toLocaleString()}</span></div>
          <div className="flex justify-between py-1 text-sm"><span>Est. Mortality Rate:</span><span className="font-semibold">{mortalityRate}%</span></div>
          <div className="flex justify-between py-1 text-sm"><span>Avg Sale Weight:</span><span className="font-semibold">{avgWeight} kg</span></div>
          <div className="flex justify-between py-1 text-sm"><span>Start Date:</span><span className="font-semibold">{new Date(startDate).toLocaleDateString('en-GB')}</span></div>
          <div className="flex justify-between py-1 text-sm"><span>Days to Sell:</span><span className="font-semibold">{daysToSell} days ({endDateDisplay})</span></div>
        </div>
        <div>
          <h3 className="font-bold border-b pb-2 mb-3">Cost Configuration</h3>
          <div className="flex justify-between py-1 text-sm"><span>Chick Purchase:</span><span className="font-semibold">{formatDZD(chickCost)} ({chickCostMode === 'per-chick' ? 'Per Chick' : 'Total'})</span></div>
          <div className="flex justify-between py-1 text-sm"><span>Feed Price & Quantity:</span><span className="font-semibold">{feedPricePerKg} DZD/kg | {feedConsumedPerChick} kg ({feedConsumedMode === 'per-chick' ? 'Per Chick' : 'Total'})</span></div>
          <div className="flex justify-between py-1 text-sm"><span>Meds/Vaccines:</span><span className="font-semibold">{formatDZD(medicationCost)} ({medicationCostMode === 'per-chick' ? 'Per Chick' : 'Total'})</span></div>
          <div className="flex justify-between py-1 text-sm"><span>Energy:</span><span className="font-semibold">{formatDZD(energyCost)} ({energyCostMode === 'per-chick' ? 'Per Chick' : 'Total'})</span></div>
          <div className="flex justify-between py-1 text-sm"><span>Cycle Labor:</span><span className="font-semibold">{formatDZD(laborCostCycle)} ({laborCostMode === 'per-chick' ? 'Per Chick' : 'Total'})</span></div>
        </div>
      </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4" id="printable-area">
          {/* Left Column: Inputs */}
          <aside className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col gap-4" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 150px)', position: 'sticky', top: '20px' }}>
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><Activity className="icon" size={20} /> Flock Details</h2>
            <div className="flex flex-col gap-2">
              <label>Starting Chicks <span>total</span></label>
              <Input type="number"   value={chicksBought} onChange={e => setChicksBought(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <label>Est. Mortality Rate <span className="unit">%</span></label>
              <Input type="number" step="0.1"   value={mortalityRate} onChange={e => setMortalityRate(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <label>Avg Sale Weight <span className="unit">kg</span></label>
              <Input type="number" step="0.1"   value={avgWeight} onChange={e => setAvgWeight(Number(e.target.value))} />
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', margin: '1rem 0' }}></div>
            
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><CalendarDays className="icon" size={20} /> Timeline</h2>
            <div className="flex flex-col gap-2">
              <label>Start Date</label>
              <Input type="date"   value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label>Days to Sell <span className="unit">days</span></label>
              <Input type="number"   value={daysToSell} onChange={e => setDaysToSell(Number(e.target.value))} />
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', margin: '1rem 0' }}></div>

            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6" style={{ marginBottom: '1.5rem' }}><Calculator className="icon" size={20} /> Costs</h2>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-muted-foreground uppercase">Chick Purchase <span className="unit">DZD</span></label>
                <Select value={chickCostMode} onValueChange={(val: any) => setChickCostMode(val)}>
                  <SelectTrigger className="w-[110px] h-7 text-xs bg-muted border-none">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per-chick">Per Chick</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" value={chickCost} onChange={e => setChickCost(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-muted-foreground uppercase">Feed Consumed <span className="unit">kg</span></label>
                <Select value={feedConsumedMode} onValueChange={(val: any) => setFeedConsumedMode(val)}>
                  <SelectTrigger className="w-[110px] h-7 text-xs bg-muted border-none">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per-chick">Per Chick</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" step="0.1" value={feedConsumedPerChick} onChange={e => setFeedConsumedPerChick(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase">Feed Price <span className="unit">DZD / kg</span></label>
              <Input type="number" value={feedPricePerKg} onChange={e => setFeedPricePerKg(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-muted-foreground uppercase">Meds/Vaccines <span className="unit">DZD</span></label>
                <Select value={medicationCostMode} onValueChange={(val: any) => setMedicationCostMode(val)}>
                  <SelectTrigger className="w-[110px] h-7 text-xs bg-muted border-none">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per-chick">Per Chick</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" value={medicationCost} onChange={e => setMedicationCost(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-muted-foreground uppercase">Energy <span className="unit">DZD</span></label>
                <Select value={energyCostMode} onValueChange={(val: any) => setEnergyCostMode(val)}>
                  <SelectTrigger className="w-[110px] h-7 text-xs bg-muted border-none">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per-chick">Per Chick</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" value={energyCost} onChange={e => setEnergyCost(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-muted-foreground uppercase">Cycle Labor <span className="unit">DZD</span></label>
                <Select value={laborCostMode} onValueChange={(val: any) => setLaborCostMode(val)}>
                  <SelectTrigger className="w-[110px] h-7 text-xs bg-muted border-none">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per-chick">Per Chick</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" value={laborCostCycle} onChange={e => setLaborCostCycle(Number(e.target.value))} />
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', margin: '1rem 0' }}></div>

            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><Database className="icon" size={20} /> Market Data</h2>
            <div className="flex flex-col gap-2">
              <label>
                Selling Price 
                <span className="unit" style={{ fontSize: '0.75rem', color: isAutoPrice ? 'var(--success)' : 'var(--warning)' }}>
                  {isAutoPrice ? '(Auto)' : '(Manual)'}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Input type="number" 
                    
                  value={sellingPrice} 
                  onChange={e => setManualSellingPrice(Number(e.target.value))} 
                />
                {!isAutoPrice && (
                  <Button 
                    onClick={() => setManualSellingPrice(null)}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                  >
                    Auto
                  </Button>
                )}
              </div>
            </div>
          </aside>

          {/* Right Column: Advanced KPIs and Charts */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" style={{ marginBottom: 0 }}>
              <div className={`kpi-card ${profit > 0 ? 'success' : 'danger'}`}>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wide"><TrendingUp size={16} /> Net Profit / Loss</div>
                <div className={`kpi-value ${profit > 0 ? 'success' : 'danger'}`}>
                  {profit > 0 ? '+' : ''}{formatDZD(profit)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Margin: {profitMargin}% | ROI: {roi}%</div>
              </div>
              <div className="kpi-card warning">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wide"><Target size={16} /> Break-Even Price</div>
                <div className="kpi-value warning">{Math.round(breakEvenPrice)} DZD/kg</div>
                <div className="text-sm text-muted-foreground mt-1">Must sell above this to profit</div>
              </div>
              <div className="kpi-card success">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wide"><Activity size={16} /> Total Revenue</div>
                <div className="kpi-value success">{formatDZD(totalRevenue)}</div>
                <div className="text-sm text-muted-foreground mt-1">From {totalMeatKg.toLocaleString()} kg meat</div>
              </div>
              <div className="kpi-card danger">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wide"><AlertTriangle size={16} /> Total Expenses</div>
                <div className="kpi-value danger">{formatDZD(totalCost)}</div>
                <div className="text-sm text-muted-foreground mt-1">All operational costs</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" style={{ marginBottom: 0 }}>
              <div className={`kpi-card ${fcr <= 1.6 ? 'success' : fcr >= 1.8 ? 'danger' : 'warning'}`}>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wide"><Wheat size={16} /> Feed Conversion (FCR)</div>
                <div className={`kpi-value ${fcr <= 1.6 ? 'success' : fcr >= 1.8 ? 'danger' : 'warning'}`}>{fcr.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground mt-1">kg of feed per kg of meat</div>
              </div>
              <div className="kpi-card success">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wide"><CheckCircle2 size={16} /> Survived / Yield</div>
                <div className="kpi-value success">{survivedChicks.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground mt-1">{Math.floor((survivedChicks/chicksBought)*100)}% Livability</div>
              </div>
              <div className="kpi-card" style={{ '--accent-gradient': 'linear-gradient(135deg, #0ea5e9, #3b82f6)' } as React.CSSProperties}>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wide"><Droplet size={16} /> Est. Water Needed</div>
                <div className="kpi-value" style={{ color: '#0ea5e9' }}>{(survivedChicks * feedConsumedPerChick * 2).toLocaleString()} L</div>
                <div className="text-sm text-muted-foreground mt-1">For the entire cycle</div>
              </div>
              <div className="kpi-card">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wide"><CalendarDays size={16} /> Sale Target Date</div>
                <div className="kpi-value">{endDateDisplay}</div>
                <div className="text-sm text-muted-foreground mt-1">In exactly {daysToSell} days</div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow p-6 mb-8 page-break-inside-avoid">
              <div className="mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="text-primary" size={20} /> Expense Distribution & Unit Cost Analysis
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visual breakdown of production costs correlated to unit economics
                </p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Donut Chart Column */}
                <div className="lg:col-span-5 flex justify-center items-center h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={costBreakdownData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={70} 
                        outerRadius={105} 
                        paddingAngle={4} 
                        dataKey="value"
                      >
                        {costBreakdownData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => formatDZD(value)} 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Metrics Table Column */}
                <div className="lg:col-span-7">
                  <div className="border rounded-lg overflow-hidden bg-background/50">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="py-2.5 font-semibold text-xs">Cost Component</TableHead>
                          <TableHead className="py-2.5 text-right font-semibold text-xs">Total Cost</TableHead>
                          <TableHead className="py-2.5 text-right font-semibold text-xs">% Total</TableHead>
                          <TableHead className="py-2.5 text-right font-semibold text-xs">Per Bird</TableHead>
                          <TableHead className="py-2.5 text-right font-semibold text-xs">Per kg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costBreakdownData.map((item, index) => {
                          const percentage = totalCost > 0 ? ((item.value / totalCost) * 100).toFixed(1) : '0.0';
                          const perBird = (item.value / chicksBought).toFixed(1);
                          const perKg = totalMeatKg > 0 ? (item.value / totalMeatKg).toFixed(1) : '0.0';
                          
                          return (
                            <TableRow key={item.name} className="hover:bg-accent/30 transition-colors">
                              <TableCell className="py-2 flex items-center gap-2 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                {item.name}
                              </TableCell>
                              <TableCell className="py-2 text-right font-semibold">{formatDZD(item.value)}</TableCell>
                              <TableCell className="py-2 text-right text-muted-foreground">{percentage}%</TableCell>
                              <TableCell className="py-2 text-right text-muted-foreground">{perBird} DA</TableCell>
                              <TableCell className="py-2 text-right text-muted-foreground">{perKg} DA</TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Summary Row */}
                        <TableRow className="bg-muted/30 font-bold border-t-2">
                          <TableCell className="py-3 font-semibold">Total Production Cost</TableCell>
                          <TableCell className="py-3 text-right text-primary font-semibold">{formatDZD(totalCost)}</TableCell>
                          <TableCell className="py-3 text-right font-semibold">100%</TableCell>
                          <TableCell className="py-3 text-right text-muted-foreground font-semibold">{(totalCost / chicksBought).toFixed(1)} DA</TableCell>
                          <TableCell className="py-3 text-right text-muted-foreground font-semibold">{totalMeatKg > 0 ? (totalCost / totalMeatKg).toFixed(1) : '0.0'} DA</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card text-card-foreground shadow p-6 h-[400px] flex flex-col" style={{ gridColumn: '1 / -1' }}>
                <div className="mb-6">
                  <h3 className="text-xl font-bold">Profit Sensitivity (Price/kg)</h3>
                </div>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sensitivityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="price" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={(val) => `${val / 1000}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value: number) => [formatDZD(value), "Profit"]} labelFormatter={(label) => `Selling Price: ${label} DZD/kg`} />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine x={sellingPrice} stroke="#8b5cf6" label={{ value: 'Current Price', fill: '#8b5cf6', position: 'top' }} />
                      <ReferenceLine x={breakEvenPrice} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Break-Even', fill: '#f59e0b', position: 'insideBottomRight' }} />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </main>
        </div>

      {/* Save Scenario Modal Overlay */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200 no-print">
          <div className="w-full max-w-md p-6 bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2 text-card-foreground">
              <Save className="text-primary" size={22} /> Save Scenario
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a descriptive name for this simulation run to save it. You can load it back later from the dropdown.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              <Label htmlFor="scenario-name" className="text-xs font-semibold text-muted-foreground uppercase">Scenario Name</Label>
              <Input 
                id="scenario-name" 
                placeholder="e.g. Summer Batch 2026" 
                value={scenarioName} 
                onChange={e => setScenarioName(e.target.value)}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmSaveScenario();
                  if (e.key === 'Escape') setIsSaveModalOpen(false);
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsSaveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmSaveScenario}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {isSaving ? 'Saving...' : 'Save Scenario'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
