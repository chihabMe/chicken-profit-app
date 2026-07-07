import { describe, it, expect } from 'vitest';
import { runProfitCalculations, type CalculationInputs } from './calculations';

describe('Poultry Profit Calculations', () => {
  
  it('should correctly compute results for standard "Per-Chick" inputs (Use Case 1)', () => {
    const inputs: CalculationInputs = {
      chicksBought: 1000,
      mortalityRate: 5,
      avgWeight: 2.2,
      chickCost: 150,
      chickCostMode: 'per-chick',
      feedConsumedPerChick: 3.8,
      feedConsumedMode: 'per-chick',
      feedPricePerKg: 90,
      medicationCost: 15,
      medicationCostMode: 'per-chick',
      energyCost: 10,
      energyCostMode: 'per-chick',
      laborCostCycle: 30,
      laborCostMode: 'per-chick',
      sellingPrice: 380,
    };

    const results = runProfitCalculations(inputs);

    // Verify Survived & Yield
    expect(results.survivedChicks).toBe(950); // Math.floor(1000 * 0.95)
    expect(results.totalMeatKg).toBe(2090); // 950 * 2.2

    // Verify Cost components
    expect(results.totalChickCost).toBe(150000); // 1000 * 150
    expect(results.totalFeedKg).toBe(3705); // (950 * 3.8) + (50 * 1.9)
    expect(results.feedCostTotal).toBe(333450); // 3705 * 90
    expect(results.totalMedsCost).toBe(15000); // 1000 * 15
    expect(results.totalEnergyCost).toBe(10000); // 1000 * 10
    expect(results.totalLaborCost).toBe(30000); // 1000 * 30

    // Verify Totals & Profit
    expect(results.totalCost).toBe(538450); // Sum of above
    expect(results.totalRevenue).toBe(794200); // 2090 * 380
    expect(results.profit).toBe(255750); // 794200 - 538450

    // Verify KPIs
    expect(results.roi).toBe('47.5'); // ((255750 / 538450) * 100)
    expect(results.profitMargin).toBe('32.2'); // ((255750 / 794200) * 100)
    expect(results.breakEvenPrice).toBeCloseTo(257.63, 1); // 538450 / 2090
    expect(results.fcr).toBeCloseTo(1.77, 2); // 3705 / 2090
  });

  it('should correctly compute results for flat "Total" input overrides (Use Case 2)', () => {
    const inputs: CalculationInputs = {
      chicksBought: 1000,
      mortalityRate: 5,
      avgWeight: 2.2,
      chickCost: 145000,
      chickCostMode: 'total',
      feedConsumedPerChick: 3700,
      feedConsumedMode: 'total',
      feedPricePerKg: 90,
      medicationCost: 12000,
      medicationCostMode: 'total',
      energyCost: 9000,
      energyCostMode: 'total',
      laborCostCycle: 25000,
      laborCostMode: 'total',
      sellingPrice: 380,
    };

    const results = runProfitCalculations(inputs);

    // Verify Survived & Yield
    expect(results.survivedChicks).toBe(950);
    expect(results.totalMeatKg).toBe(2090);

    // Verify Cost components are directly overwritten
    expect(results.totalChickCost).toBe(145000);
    expect(results.totalFeedKg).toBe(3700); // Flat override
    expect(results.feedCostTotal).toBe(333000); // 3700 * 90
    expect(results.totalMedsCost).toBe(12000);
    expect(results.totalEnergyCost).toBe(9000);
    expect(results.totalLaborCost).toBe(25000);

    // Verify Totals & Profit
    expect(results.totalCost).toBe(524000); // Sum of above
    expect(results.totalRevenue).toBe(794200);
    expect(results.profit).toBe(270200);

    // Verify KPIs
    expect(results.roi).toBe('51.6');
    expect(results.profitMargin).toBe('34.0');
    expect(results.breakEvenPrice).toBeCloseTo(250.72, 1);
    expect(results.fcr).toBeCloseTo(1.77, 2);
  });
});
