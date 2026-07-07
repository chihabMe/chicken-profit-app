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
import { runProfitCalculations } from '../../lib/calculations';

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
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

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
    setSelectedScenarioId(value);
    
    const selectedSim = savedSimulations.find(s => s.id.toString() === value);
    if (!selectedSim) return;
    
    try {
      const simData = selectedSim.data;
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
      toast.success(`Loaded scenario: ${selectedSim.name}`);
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

  // Advanced Calculations & Costs
  const calcResults = useMemo(() => {
    return runProfitCalculations({
      chicksBought,
      mortalityRate,
      avgWeight,
      chickCost,
      chickCostMode,
      feedConsumedPerChick,
      feedConsumedMode,
      feedPricePerKg,
      medicationCost,
      medicationCostMode,
      energyCost,
      energyCostMode,
      laborCostCycle,
      laborCostMode,
      sellingPrice
    });
  }, [
    chicksBought,
    mortalityRate,
    avgWeight,
    chickCost,
    chickCostMode,
    feedConsumedPerChick,
    feedConsumedMode,
    feedPricePerKg,
    medicationCost,
    medicationCostMode,
    energyCost,
    energyCostMode,
    laborCostCycle,
    laborCostMode,
    sellingPrice
  ]);

  const {
    survivedChicks,
    totalMeatKg,
    totalChickCost,
    totalFeedKg,
    feedCostTotal,
    totalMedsCost,
    totalEnergyCost,
    totalLaborCost,
    totalCost,
    totalRevenue,
    profit,
    roi,
    profitMargin,
    breakEvenPrice,
    fcr
  } = calcResults;

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
          <Select value={selectedScenarioId} onValueChange={handleLoadScenarioValue}>
            <SelectTrigger className="w-full bg-input/40 h-10 border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <FolderOpen size={16} />
                <SelectValue placeholder="Load Saved Scenario..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              {savedSimulations.map(sim => (
                <SelectItem key={sim.id} value={sim.id.toString()}>
                  {sim.name} ({new Date(sim.createdAt).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap w-full sm:w-auto gap-2 justify-end">
          <Button onClick={handleSaveScenario}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Save size={16} /> Save Scenario
          </Button>
          <Button onClick={handlePrint}
            variant="outline"
            className="border-primary/20 hover:bg-primary/5 text-primary font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} /> Print / Save PDF
          </Button>
          <Button onClick={handleExportCSV}
            variant="outline"
            className="border-border hover:bg-accent text-foreground flex items-center gap-2 cursor-pointer"
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
    
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6" id="printable-area">
          {/* Left Column: Inputs */}
          <aside className="no-print lg:sticky lg:top-6" style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
            <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-xl rounded-2xl">
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Calculator className="text-primary size-5" /> Simulation Parameters
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Adjust inputs to compute unit economics and profits.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 pt-5">
                
                {/* Flock Details */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground pb-1 border-b border-border/40"><Activity className="text-primary size-4" /> Flock Details</h3>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Starting Chicks</label>
                    <Input type="number" className="h-10 bg-background/50 border-border/80" value={chicksBought} onChange={e => setChicksBought(Number(e.target.value))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Mortality Rate (%)</label>
                    <Input type="number" step="0.1" className="h-10 bg-background/50 border-border/80" value={mortalityRate} onChange={e => setMortalityRate(Number(e.target.value))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Sale Weight (kg)</label>
                    <Input type="number" step="0.1" className="h-10 bg-background/50 border-border/80" value={avgWeight} onChange={e => setAvgWeight(Number(e.target.value))} />
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground pb-1 border-b border-border/40"><CalendarDays className="text-primary size-4" /> Timeline</h3>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Date</label>
                    <Input type="date" className="h-10 bg-background/50 border-border/80" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Days to Sell (days)</label>
                    <Input type="number" className="h-10 bg-background/50 border-border/80" value={daysToSell} onChange={e => setDaysToSell(Number(e.target.value))} />
                  </div>
                </div>

                {/* Costs */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground pb-1 border-b border-border/40"><Calculator className="text-primary size-4" /> Costs</h3>
                  
                  {/* Chick Purchase */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chick Purchase (DZD)</label>
                      <div className="flex bg-muted/80 p-0.5 rounded-lg border border-border/50 text-xs font-semibold h-8 items-center gap-0.5 w-32 shadow-inner">
                        <button 
                          type="button"
                          onClick={() => setChickCostMode('per-chick')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${chickCostMode === 'per-chick' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Chick
                        </button>
                        <button 
                          type="button"
                          onClick={() => setChickCostMode('total')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${chickCostMode === 'total' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Total
                        </button>
                      </div>
                    </div>
                    <Input type="number" className="h-10 bg-background/50 border-border/80" value={chickCost} onChange={e => setChickCost(Number(e.target.value))} />
                  </div>

                  {/* Feed Consumed */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feed Consumed (kg)</label>
                      <div className="flex bg-muted/80 p-0.5 rounded-lg border border-border/50 text-xs font-semibold h-8 items-center gap-0.5 w-32 shadow-inner">
                        <button 
                          type="button"
                          onClick={() => setFeedConsumedMode('per-chick')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${feedConsumedMode === 'per-chick' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Chick
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeedConsumedMode('total')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${feedConsumedMode === 'total' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Total
                        </button>
                      </div>
                    </div>
                    <Input type="number" step="0.1" className="h-10 bg-background/50 border-border/80" value={feedConsumedPerChick} onChange={e => setFeedConsumedPerChick(Number(e.target.value))} />
                  </div>

                  {/* Feed Price */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feed Price (DZD/kg)</label>
                    <Input type="number" className="h-10 bg-background/50 border-border/80" value={feedPricePerKg} onChange={e => setFeedPricePerKg(Number(e.target.value))} />
                  </div>

                  {/* Meds/Vaccines */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meds/Vaccines (DZD)</label>
                      <div className="flex bg-muted/80 p-0.5 rounded-lg border border-border/50 text-xs font-semibold h-8 items-center gap-0.5 w-32 shadow-inner">
                        <button 
                          type="button"
                          onClick={() => setMedicationCostMode('per-chick')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${medicationCostMode === 'per-chick' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Chick
                        </button>
                        <button 
                          type="button"
                          onClick={() => setMedicationCostMode('total')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${medicationCostMode === 'total' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Total
                        </button>
                      </div>
                    </div>
                    <Input type="number" className="h-10 bg-background/50 border-border/80" value={medicationCost} onChange={e => setMedicationCost(Number(e.target.value))} />
                  </div>

                  {/* Energy */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Energy (DZD)</label>
                      <div className="flex bg-muted/80 p-0.5 rounded-lg border border-border/50 text-xs font-semibold h-8 items-center gap-0.5 w-32 shadow-inner">
                        <button 
                          type="button"
                          onClick={() => setEnergyCostMode('per-chick')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${energyCostMode === 'per-chick' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Chick
                        </button>
                        <button 
                          type="button"
                          onClick={() => setEnergyCostMode('total')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${energyCostMode === 'total' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Total
                        </button>
                      </div>
                    </div>
                    <Input type="number" className="h-10 bg-background/50 border-border/80" value={energyCost} onChange={e => setEnergyCost(Number(e.target.value))} />
                  </div>

                  {/* Cycle Labor */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cycle Labor (DZD)</label>
                      <div className="flex bg-muted/80 p-0.5 rounded-lg border border-border/50 text-xs font-semibold h-8 items-center gap-0.5 w-32 shadow-inner">
                        <button 
                          type="button"
                          onClick={() => setLaborCostMode('per-chick')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${laborCostMode === 'per-chick' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Chick
                        </button>
                        <button 
                          type="button"
                          onClick={() => setLaborCostMode('total')}
                          className={`flex-1 h-6 rounded-md transition-all duration-200 cursor-pointer text-center text-[10px] uppercase font-bold ${laborCostMode === 'total' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'}`}
                        >
                          Total
                        </button>
                      </div>
                    </div>
                    <Input type="number" className="h-10 bg-background/50 border-border/80" value={laborCostCycle} onChange={e => setLaborCostCycle(Number(e.target.value))} />
                  </div>
                </div>

                <div className="border-t border-border/50 my-2"></div>

                {/* Market Price Setting */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-foreground pb-1 border-b border-border/40"><Database className="text-primary size-4" /> Market Data</h3>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex justify-between items-center uppercase tracking-wider">
                      Selling Price
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isAutoPrice ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {isAutoPrice ? 'AUTO' : 'MANUAL'}
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Input type="number" className="h-10 bg-background/50 border-border/80 flex-1" value={sellingPrice} onChange={e => setManualSellingPrice(Number(e.target.value))} />
                      {!isAutoPrice && (
                        <Button 
                          onClick={() => setManualSellingPrice(null)}
                          variant="secondary"
                          className="h-10 border border-border/80 hover:bg-accent/80 font-semibold cursor-pointer"
                        >
                          Auto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </aside>

          {/* Right Column: Advanced KPIs and Charts */}
          <main className="flex flex-col gap-6">
            
            {/* KPI Cards Grid First Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Net Profit */}
              <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
                <div className={`absolute top-0 left-0 w-full h-[4px] ${profit > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} className={profit > 0 ? "text-emerald-500" : "text-rose-500"} /> Net Profit / Loss
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-extrabold tracking-tight ${profit > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {profit > 0 ? '+' : ''}{formatDZD(profit)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    Margin: <span className="text-foreground">{profitMargin}%</span> | ROI: <span className="text-foreground">{roi}%</span>
                  </p>
                </CardContent>
              </Card>

              {/* Card 2: Break-Even */}
              <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-amber-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={14} className="text-amber-500" /> Break-Even Price
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold tracking-tight text-amber-500">
                    {Math.round(breakEvenPrice)} DZD/kg
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    Must sell above this to yield profit.
                  </p>
                </CardContent>
              </Card>

              {/* Card 3: Total Revenue */}
              <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-indigo-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={14} className="text-indigo-500" /> Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold tracking-tight text-indigo-500">
                    {formatDZD(totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    From <span className="text-foreground">{totalMeatKg.toLocaleString()} kg</span> of yield.
                  </p>
                </CardContent>
              </Card>

              {/* Card 4: Total Expenses */}
              <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-rose-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-rose-500" /> Total Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold tracking-tight text-rose-500">
                    {formatDZD(totalCost)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    All operating costs combined.
                  </p>
                </CardContent>
              </Card>

            </div>

            {/* KPI Cards Grid Second Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 5: FCR */}
              <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
                <div className={`absolute top-0 left-0 w-full h-[4px] ${fcr <= 1.6 ? "bg-emerald-500" : fcr >= 1.8 ? "bg-rose-500" : "bg-amber-500"}`} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Wheat size={14} className={fcr <= 1.6 ? "text-emerald-500" : fcr >= 1.8 ? "text-rose-500" : "text-amber-500"} /> Feed Conversion (FCR)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-extrabold tracking-tight ${fcr <= 1.6 ? "text-emerald-500" : fcr >= 1.8 ? "text-rose-500" : "text-amber-500"}`}>
                    {fcr.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    kg feed consumed per kg meat yield.
                  </p>
                </CardContent>
              </Card>

              {/* Card 6: Survived / Yield */}
              <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-emerald-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" /> Survived / Yield
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold tracking-tight text-emerald-500">
                    {survivedChicks.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    <span className="text-foreground">{Math.floor((survivedChicks/chicksBought)*100)}%</span> Livability rate.
                  </p>
                </CardContent>
              </Card>

              {/* Card 7: Est. Water Needed */}
              <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-sky-500" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Droplet size={14} className="text-sky-500" /> Est. Water Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold tracking-tight text-sky-500">
                    {(survivedChicks * feedConsumedPerChick * 2).toLocaleString()} L
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    Estimated for the entire cycle run.
                  </p>
                </CardContent>
              </Card>

              {/* Card 8: Sale Target Date */}
              <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-primary" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarDays size={14} className="text-primary" /> Sale Target Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold tracking-tight text-foreground">
                    {endDateDisplay}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                    Cycle completion in <span className="text-foreground">{daysToSell} days</span>.
                  </p>
                </CardContent>
              </Card>

            </div>

            {/* Widescreen Expense Distribution Card */}
            <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden page-break-inside-avoid">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Activity className="text-primary size-5" /> Expense Distribution & Unit Cost Analysis
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Detailed cost breakdown calculated relative to bird yield and total weight.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
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
                          contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--foreground)' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Metrics Table Column */}
                  <div className="lg:col-span-7">
                    <div className="border border-border/80 rounded-xl overflow-hidden bg-background/30">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow className="border-b border-border/50">
                            <TableHead className="py-3 font-bold text-xs text-foreground/80">Cost Component</TableHead>
                            <TableHead className="py-3 text-right font-bold text-xs text-foreground/80">Total Cost</TableHead>
                            <TableHead className="py-3 text-right font-bold text-xs text-foreground/80">% Total</TableHead>
                            <TableHead className="py-3 text-right font-bold text-xs text-foreground/80">Per Chick</TableHead>
                            <TableHead className="py-3 text-right font-bold text-xs text-foreground/80">Per kg</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {costBreakdownData.map((item, index) => {
                            const percentage = totalCost > 0 ? ((item.value / totalCost) * 100).toFixed(1) : '0.0';
                            const perBird = (item.value / chicksBought).toFixed(1);
                            const perKg = totalMeatKg > 0 ? (item.value / totalMeatKg).toFixed(1) : '0.0';
                            
                            return (
                              <TableRow key={item.name} className="hover:bg-accent/40 border-b border-border/40 transition-colors">
                                <TableCell className="py-2.5 flex items-center gap-2 font-medium text-foreground">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                  {item.name}
                                </TableCell>
                                <TableCell className="py-2.5 text-right font-semibold text-foreground">{formatDZD(item.value)}</TableCell>
                                <TableCell className="py-2.5 text-right text-muted-foreground">{percentage}%</TableCell>
                                <TableCell className="py-2.5 text-right text-muted-foreground">{perBird} DA</TableCell>
                                <TableCell className="py-2.5 text-right text-muted-foreground">{perKg} DA</TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Summary Row */}
                          <TableRow className="bg-muted/20 font-bold border-t border-border/50">
                            <TableCell className="py-3.5 font-bold text-foreground">Total Production Cost</TableCell>
                            <TableCell className="py-3.5 text-right text-primary font-extrabold">{formatDZD(totalCost)}</TableCell>
                            <TableCell className="py-3.5 text-right font-bold text-foreground">100%</TableCell>
                            <TableCell className="py-3.5 text-right text-muted-foreground font-semibold">{(totalCost / chicksBought).toFixed(1)} DA</TableCell>
                            <TableCell className="py-3.5 text-right text-muted-foreground font-semibold">{totalMeatKg > 0 ? (totalCost / totalMeatKg).toFixed(1) : '0.0'} DA</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profit Sensitivity Line Chart */}
            <div className="grid grid-cols-1">
              <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-xl rounded-2xl h-[400px] flex flex-col p-6 overflow-hidden page-break-inside-avoid">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <ChartIcon className="text-primary size-5" /> Profit Sensitivity (Price / kg)
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Simulate how market price fluctuations affect cycle profits relative to your break-even point.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 w-full min-h-0 p-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sensitivityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="price" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={(val) => `${val / 1000}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--foreground)' }} formatter={(value: number) => [formatDZD(value), "Profit"]} labelFormatter={(label) => `Selling Price: ${label} DZD/kg`} />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine x={sellingPrice} stroke="var(--primary)" label={{ value: 'Current Price', fill: 'var(--primary)', position: 'top' }} />
                      <ReferenceLine x={breakEvenPrice} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Break-Even', fill: '#f59e0b', position: 'insideBottomRight' }} />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

      {/* Save Scenario Modal Overlay */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200 no-print">
          <div className="w-full max-w-md p-6 bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2 text-foreground">
              <Save className="text-primary size-5" /> Save Scenario
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Enter a descriptive name for this simulation run to save it. You can load it back later from the dropdown.
            </p>
            <div className="flex flex-col gap-1.5 mb-6">
              <Label htmlFor="scenario-name" className="text-xs font-semibold text-muted-foreground uppercase">Scenario Name</Label>
              <Input 
                id="scenario-name" 
                placeholder="e.g. Summer Batch 2026" 
                value={scenarioName} 
                className="h-10 bg-background/50 border-border/80"
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
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmSaveScenario}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer"
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
