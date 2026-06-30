"use client";
import { useState, useMemo, useEffect } from 'react';
import { 
  Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, ReferenceLine, PieChart, Pie, Cell, Legend, ComposedChart, Bar
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, Activity, CheckCircle2, Calculator, CalendarDays, 
  Database, Wheat, Target, Droplet, Syringe, LineChart as ChartIcon, LayoutDashboard, Save, LogIn, LogOut, FolderOpen
} from 'lucide-react';

import { useSession, signIn, signOut } from "next-auth/react";
import { saveSimulation, getSimulations, createFlock, getFlocks, logFlockDaily, getFlockLogs } from "../actions";
import { useRouter } from "next/navigation";

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

  // Custom Auth State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = async () => {
    setAuthError('');
    if (!authEmail || !authPassword) {
      setAuthError("Enter email and password!");
      return;
    }
    const res = await signIn('credentials', { 
      email: authEmail, 
      password: authPassword,
      redirect: false
    });
    
    if (res?.error) {
      setAuthError("Invalid email or password");
    }
  };

  const [showSettings, setShowSettings] = useState(false);

  const handleInviteUser = async () => {
    const email = prompt("Enter the email of the user to invite:");
    if (!email) return;
    const res = await fetch('/api/users/invite', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) alert(data.message);
    else alert(data.error);
  };

  const handleChangePassword = async () => {
    const newPassword = prompt("Enter your new password (min 6 characters):");
    if (!newPassword) return;
    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ newPassword })
    });
    if (res.ok) alert("Password changed successfully!");
    else alert("Failed to change password.");
  };

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
    if (!newFlockName) return alert("Flock name required");
    await createFlock(newFlockName, newFlockChicks, newFlockDate);
    const updated = await getFlocks();
    setFlocks(updated);
    setNewFlockName('');
  };

  const handleLogDaily = async () => {
    if (!activeFlockId) return alert("Select a flock first");
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
  const [feedConsumedPerChick, setFeedConsumedPerChick] = useState(3.8); // kg
  const [feedPricePerKg, setFeedPricePerKg] = useState(80); // DZD
  const [medicationCost, setMedicationCost] = useState(15); // DZD per chick
  const [energyCost, setEnergyCost] = useState(20); // Heating/Electricity DZD per chick
  const [laborCostCycle, setLaborCostCycle] = useState(30000); // Total labor cost for the cycle DZD
  
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
    const simName = prompt("Enter a name for this scenario (e.g. Summer Batch 2026):");
    if (!simName) return;

    setIsSaving(true);
    const data = {
      chicksBought, mortalityRate, startDate, daysToSell, avgWeight,
      chickCost, feedConsumedPerChick, feedPricePerKg, medicationCost, energyCost, laborCostCycle
    };

    try {
      await saveSimulation(simName, data);
      const updated = await getSimulations();
      setSavedSimulations(updated);
      alert("Scenario saved successfully!");
    } catch (err) {
      alert("Failed to save scenario.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadScenario = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!e.target.value) return;
    const simData = JSON.parse(e.target.value);
    
    setChicksBought(simData.chicksBought ?? 1000);
    setMortalityRate(simData.mortalityRate ?? 5);
    setStartDate(simData.startDate ?? new Date().toISOString().split('T')[0]);
    setDaysToSell(simData.daysToSell ?? 45);
    setAvgWeight(simData.avgWeight ?? 2.5);
    setChickCost(simData.chickCost ?? 150);
    setFeedConsumedPerChick(simData.feedConsumedPerChick ?? 3.8);
    setFeedPricePerKg(simData.feedPricePerKg ?? 80);
    setMedicationCost(simData.medicationCost ?? 15);
    setEnergyCost(simData.energyCost ?? 20);
    setLaborCostCycle(simData.laborCostCycle ?? 30000);
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
  const totalChickCost = chicksBought * chickCost;
  const feedCostTotal = (survivedChicks * feedConsumedPerChick * feedPricePerKg) + 
                        ((chicksBought - survivedChicks) * (feedConsumedPerChick / 2) * feedPricePerKg);
  const totalMedsCost = chicksBought * medicationCost;
  const totalEnergyCost = chicksBought * energyCost;
  
  const totalCost = totalChickCost + feedCostTotal + totalMedsCost + totalEnergyCost + laborCostCycle;
  
  const totalRevenue = totalMeatKg * sellingPrice;
  const profit = totalRevenue - totalCost;
  
  // KPIs
  const roi = ((profit / totalCost) * 100).toFixed(1);
  const profitMargin = ((profit / totalRevenue) * 100).toFixed(1);
  const breakEvenPrice = totalCost / totalMeatKg;
  const fcr = feedConsumedPerChick / avgWeight;

  // Chart Data
  const costBreakdownData = [
    { name: 'Chicks', value: totalChickCost },
    { name: 'Feed', value: feedCostTotal },
    { name: 'Meds & Vaccines', value: totalMedsCost },
    { name: 'Energy', value: totalEnergyCost },
    { name: 'Labor', value: laborCostCycle },
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
    for (let day = 1; day <= daysToSell; day++) {
      const growthFactor = Math.pow(day / daysToSell, 2);
      const dailyFeed = (feedConsumedPerChick / daysToSell) * 0.5 + (growthFactor * 0.1); 
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
  }, [daysToSell, feedConsumedPerChick, chicksBought, survivedChicks, avgWeight]);

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
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <select 
        onChange={handleLoadScenario} 
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0.6rem', borderRadius: '6px', outline: 'none', flex: 1 }}
      >
        <option value="">📁 Load Saved Scenario...</option>
        {savedSimulations.map(sim => (
          <option key={sim.id} value={JSON.stringify(sim.data)}>
            {sim.name} ({new Date(sim.createdAt).toLocaleDateString()})
          </option>
        ))}
      </select>

      <button 
        onClick={handleSaveScenario}
        disabled={isSaving}
        className="btn"
        style={{ background: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success)' }}
      >
        <Save size={18} /> {isSaving ? 'Saving...' : 'Save Current Scenario'}
      </button>
    </div>
    
    <div className="dashboard">
          {/* Left Column: Inputs */}
          <aside className="card input-section" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 150px)', position: 'sticky', top: '20px' }}>
            <h2 className="section-title"><Activity className="icon" size={20} /> Flock Details</h2>
            <div className="input-group">
              <label>Starting Chicks <span>total</span></label>
              <input type="number" className="input-field" value={chicksBought} onChange={e => setChicksBought(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Est. Mortality Rate <span className="unit">%</span></label>
              <input type="number" step="0.1" className="input-field" value={mortalityRate} onChange={e => setMortalityRate(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Avg Sale Weight <span className="unit">kg</span></label>
              <input type="number" step="0.1" className="input-field" value={avgWeight} onChange={e => setAvgWeight(Number(e.target.value))} />
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', margin: '1rem 0' }}></div>
            
            <h2 className="section-title"><CalendarDays className="icon" size={20} /> Timeline</h2>
            <div className="input-group">
              <label>Start Date</label>
              <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Days to Sell <span className="unit">days</span></label>
              <input type="number" className="input-field" value={daysToSell} onChange={e => setDaysToSell(Number(e.target.value))} />
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', margin: '1rem 0' }}></div>

            <h2 className="section-title"><Calculator className="icon" size={20} /> Operational Costs</h2>
            <div className="input-group">
              <label>Chick Purchase Price <span className="unit">DZD</span></label>
              <input type="number" className="input-field" value={chickCost} onChange={e => setChickCost(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Total Feed per Chick <span className="unit">kg</span></label>
              <input type="number" step="0.1" className="input-field" value={feedConsumedPerChick} onChange={e => setFeedConsumedPerChick(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Feed Price <span className="unit">DZD / kg</span></label>
              <input type="number" className="input-field" value={feedPricePerKg} onChange={e => setFeedPricePerKg(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Meds/Vaccines per Chick <span className="unit">DZD</span></label>
              <input type="number" className="input-field" value={medicationCost} onChange={e => setMedicationCost(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Energy per Chick <span className="unit">DZD</span></label>
              <input type="number" className="input-field" value={energyCost} onChange={e => setEnergyCost(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>Cycle Labor Total <span className="unit">DZD</span></label>
              <input type="number" className="input-field" value={laborCostCycle} onChange={e => setLaborCostCycle(Number(e.target.value))} />
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', margin: '1rem 0' }}></div>

            <h2 className="section-title"><Database className="icon" size={20} /> Market Data</h2>
            <div className="input-group">
              <label>
                Selling Price 
                <span className="unit" style={{ fontSize: '0.75rem', color: isAutoPrice ? 'var(--success)' : 'var(--warning)' }}>
                  {isAutoPrice ? '(Auto)' : '(Manual)'}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  className="input-field" 
                  value={sellingPrice} 
                  onChange={e => setManualSellingPrice(Number(e.target.value))} 
                />
                {!isAutoPrice && (
                  <button 
                    onClick={() => setManualSellingPrice(null)}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '0 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Right Column: Advanced KPIs and Charts */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              <div className={`kpi-card ${profit > 0 ? 'success' : 'danger'}`}>
                <div className="kpi-title"><TrendingUp size={16} /> Net Profit / Loss</div>
                <div className={`kpi-value ${profit > 0 ? 'success' : 'danger'}`}>
                  {profit > 0 ? '+' : ''}{formatDZD(profit)}
                </div>
                <div className="kpi-subtext">Margin: {profitMargin}% | ROI: {roi}%</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title"><Target size={16} /> Break-Even Price</div>
                <div className="kpi-value">{Math.round(breakEvenPrice)} DZD/kg</div>
                <div className="kpi-subtext">Must sell above this to profit</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title"><Activity size={16} /> Total Revenue</div>
                <div className="kpi-value success">{formatDZD(totalRevenue)}</div>
                <div className="kpi-subtext">From {totalMeatKg.toLocaleString()} kg meat</div>
              </div>
              <div className="kpi-card warning">
                <div className="kpi-title"><AlertTriangle size={16} /> Total Expenses</div>
                <div className="kpi-value danger">{formatDZD(totalCost)}</div>
                <div className="kpi-subtext">All operational costs</div>
              </div>
            </div>

            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              <div className="kpi-card" style={{ background: fcr <= 1.6 ? 'var(--success-bg)' : fcr >= 1.8 ? 'var(--danger-bg)' : 'var(--bg-card)'}}>
                <div className="kpi-title"><Wheat size={16} /> Feed Conversion (FCR)</div>
                <div className="kpi-value">{fcr.toFixed(2)}</div>
                <div className="kpi-subtext">kg of feed per kg of meat</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title"><CheckCircle2 size={16} /> Survived / Yield</div>
                <div className="kpi-value">{survivedChicks.toLocaleString()}</div>
                <div className="kpi-subtext">{Math.floor((survivedChicks/chicksBought)*100)}% Livability</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title"><Droplet size={16} /> Est. Water Needed</div>
                <div className="kpi-value">{(survivedChicks * feedConsumedPerChick * 2).toLocaleString()} L</div>
                <div className="kpi-subtext">For the entire cycle</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title"><CalendarDays size={16} /> Sale Target Date</div>
                <div className="kpi-value" style={{ fontSize: '1.25rem' }}>{endDateDisplay}</div>
                <div className="kpi-subtext">In exactly {daysToSell} days</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                  <Syringe className="icon" size={20} /> Suggested Medical Schedule
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {VACCINE_SCHEDULE.filter(v => v.day <= daysToSell).map((v, i) => {
                    const actionDate = new Date(startDate);
                    actionDate.setDate(actionDate.getDate() + v.day - 1);
                    const isPast = new Date() > actionDate;
                    const isToday = new Date().toDateString() === actionDate.toDateString();
                    
                    return (
                      <div key={i} style={{ 
                        display: 'flex', gap: '1rem', padding: '0.75rem', borderRadius: '8px',
                        background: isToday ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-input)',
                        borderLeft: `3px solid ${isToday ? 'var(--accent)' : isPast ? 'var(--success)' : 'var(--text-muted)'}`,
                        opacity: isPast ? 0.7 : 1
                      }}>
                        <div style={{ fontWeight: 600, minWidth: '50px', color: isToday ? 'var(--accent)' : 'inherit' }}>Day {v.day}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{v.action}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {actionDate.toLocaleDateString('en-GB')}
                          </div>
                        </div>
                        {isPast && !isToday && <CheckCircle2 size={16} color="var(--success)" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="chart-container" style={{ height: 'auto' }}>
                <div className="chart-header">
                  <h3 className="chart-title">Expense Distribution</h3>
                </div>
                <div className="chart-body" style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={costBreakdownData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {costBreakdownData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatDZD(value)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-container" style={{ gridColumn: '1 / -1' }}>
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="chart-title">Daily Resources & Expected Growth Curve</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>*Based on S-Curve model for {avgWeight}kg target</span>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={resourceData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="#94a3b8" minTickGap={5} />
                      <YAxis yAxisId="left" stroke="#94a3b8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="waterLiters" name="Water (Liters/Day)" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.2)" />
                      <Area yAxisId="left" type="monotone" dataKey="feedKg" name="Feed (Kg/Day)" stroke="#f59e0b" fill="rgba(245, 158, 11, 0.4)" />
                      <Line yAxisId="right" type="monotone" dataKey="weightGrams" name="Exp. Weight/Bird (Grams)" stroke="#10b981" strokeWidth={3} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-container" style={{ gridColumn: '1 / -1' }}>
                <div className="chart-header">
                  <h3 className="chart-title">Profit Sensitivity (Price/kg)</h3>
                </div>
                <div className="chart-body">
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
    </>
  );
};

export default App;
