export interface CalculationInputs {
  chicksBought: number;
  mortalityRate: number;
  avgWeight: number;
  chickCost: number;
  chickCostMode: 'per-chick' | 'total';
  feedConsumedPerChick: number;
  feedConsumedMode: 'per-chick' | 'total';
  feedPricePerKg: number;
  medicationCost: number;
  medicationCostMode: 'per-chick' | 'total';
  energyCost: number;
  energyCostMode: 'per-chick' | 'total';
  laborCostCycle: number;
  laborCostMode: 'per-chick' | 'total';
  sellingPrice: number;
}

export interface CalculationOutputs {
  survivedChicks: number;
  totalMeatKg: number;
  totalChickCost: number;
  totalFeedKg: number;
  feedCostTotal: number;
  totalMedsCost: number;
  totalEnergyCost: number;
  totalLaborCost: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  roi: string;
  profitMargin: string;
  breakEvenPrice: number;
  fcr: number;
}

export function runProfitCalculations(inputs: CalculationInputs): CalculationOutputs {
  const {
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
  } = inputs;

  // Survived chicks is starting flock adjusted for mortality rate (floored to match real birds count)
  const survivedChicks = Math.floor(chicksBought * (1 - mortalityRate / 100));
  const totalMeatKg = survivedChicks * avgWeight;
  
  // Total cost calculations
  const totalChickCost = chickCostMode === 'per-chick' ? chicksBought * chickCost : chickCost;
  
  // Feed consumed calculation accounts for feed consumed by birds that did not survive the full cycle
  // (Assuming on average they consumed half the target food before mortality)
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
  
  const roi = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : '0.0';
  const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : '0.0';
  const breakEvenPrice = totalMeatKg > 0 ? totalCost / totalMeatKg : 0;
  const fcr = totalMeatKg > 0 ? totalFeedKg / totalMeatKg : 0;

  return {
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
  };
}
