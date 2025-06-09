import { calculateYieldDistribution, calculateTokenPrice, calculateYieldOnInvestment } from '../src/utils/calculations';

describe('Financial Calculations', () => {
    describe('calculateYieldDistribution', () => {
        test('should calculate quarterly distributions correctly', () => {
            const result = calculateYieldDistribution(100000, 8, 'quarterly');
            
            expect(result.periodsPerYear).toBe(4);
            expect(result.ratePerPeriod).toBe(2); // 8% / 4 quarters
            expect(result.amountPerPeriod).toBe(2000); // 100000 * 0.02
            expect(result.totalAnnualAmount).toBe(8000); // 2000 * 4
        });

        test('should calculate monthly distributions correctly', () => {
            const result = calculateYieldDistribution(120000, 6, 'monthly');
            
            expect(result.periodsPerYear).toBe(12);
            expect(result.ratePerPeriod).toBe(0.5); // 6% / 12 months
            expect(result.amountPerPeriod).toBe(600); // 120000 * 0.005
            expect(result.totalAnnualAmount).toBe(7200); // 600 * 12
        });
    });

    describe('calculateTokenPrice', () => {
        test('should calculate token price correctly', () => {
            expect(calculateTokenPrice(1000000, 10000)).toBe(100);
            expect(calculateTokenPrice(500000, 5000)).toBe(100);
            expect(calculateTokenPrice(2000000, 20000)).toBe(100);
        });
    });

    describe('calculateYieldOnInvestment', () => {
        test('should calculate investment yields correctly', () => {
            const result = calculateYieldOnInvestment(50000, 7.2, 'quarterly');
            
            expect(result.annualYield).toBe(3600); // 50000 * 0.072
            expect(result.periodicYield).toBe(900); // 3600 / 4
            expect(result.periodsPerYear).toBe(4);
        });

        test('should handle monthly yields', () => {
            const result = calculateYieldOnInvestment(100000, 12, 'monthly');
            
            expect(result.annualYield).toBe(12000);
            expect(result.periodicYield).toBe(1000); // 12000 / 12
            expect(result.periodsPerYear).toBe(12);
        });
    });
});
