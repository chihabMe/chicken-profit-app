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
import { saveSimulation, getSimulations, createFlock, getFlocks, logFlockDaily, getFlockLogs } from "../../actions";
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

const App = ({ dict, lang }: { dict: any, lang: string }) => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    localStorage.setItem('preferredLang', newLang);
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000`;
    router.push(`/${newLang}`);
  };
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
        <div className="logger-tab" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <h2 className="section-title"><FolderOpen className="icon" size={20} /> Flock Management</h2>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Active Flocks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {flocks.length === 0 ? <p style={{color:'var(--text-muted)'}}>No active flocks.</p> : flocks.map(f => (
                    <div 
                      key={f.id} 
                      onClick={() => setActiveFlockId(f.id)}
                      style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', background: activeFlockId === f.id ? 'var(--accent-gradient)' : 'var(--bg-input)' }}
                    >
                      <div style={{ fontWeight: 600, color: activeFlockId === f.id ? 'white' : 'var(--text-primary)' }}>{f.name}</div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.8, color: activeFlockId === f.id ? 'white' : 'var(--text-secondary)' }}>Started: {f.startDate} | Chicks: {f.chicksBought}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ flex: 1, minWidth: '300px', background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Start New Flock</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input className="input-field" type="text" placeholder="Flock Name (e.g. Summer 2026 Batch)" value={newFlockName} onChange={e => setNewFlockName(e.target.value)} />
                  <input className="input-field" type="number" placeholder="Chicks Bought" value={newFlockChicks} onChange={e => setNewFlockChicks(Number(e.target.value))} />
                  <input className="input-field" type="date" value={newFlockDate} onChange={e => setNewFlockDate(e.target.value)} />
                  <button className="btn primary" onClick={handleCreateFlock}>Create Flock</button>
                </div>
              </div>
            </div>
          </div>

          {activeFlockId && (
            <div className="card">
              <h2 className="section-title"><CheckCircle2 className="icon" size={20} /> Daily Log - {flocks.find(f => f.id === activeFlockId)?.name}</h2>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Add Log Entry</h3>
                  <div className="input-group">
                    <label>Day Number</label>
                    <input className="input-field" type="number" value={logDay} onChange={e => setLogDay(Number(e.target.value))} />
                  </div>
                  <div className="input-group">
                    <label>Mortality (Deaths)</label>
                    <input className="input-field" type="number" value={logMortality} onChange={e => setLogMortality(Number(e.target.value))} />
                  </div>
                  <div className="input-group">
                    <label>Feed Intake (kg)</label>
                    <input className="input-field" type="number" value={logFeed} onChange={e => setLogFeed(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Notes (Vaccines / Meds)</label>
                    <input className="input-field" type="text" placeholder="Optional notes..." value={logNotes} onChange={e => setLogNotes(e.target.value)} />
                  </div>
                  <button className="btn" style={{ background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success)' }} onClick={handleLogDaily}>Submit Log</button>
                </div>

                <div style={{ flex: '2', minWidth: '400px' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>History</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Day</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Mortality</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Feed (kg)</th>
                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flockLogs.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: '1rem', color: 'var(--text-muted)' }}>No logs yet.</td></tr>
                      ) : flockLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>Day {log.dayNumber}</td>
                          <td style={{ padding: '0.75rem', color: log.mortality > 0 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: log.mortality > 0 ? 700 : 400 }}>{log.mortality}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{log.feedIntakeKg}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{log.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
  );
};

export default App;
