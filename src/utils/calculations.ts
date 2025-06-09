export function calculateYieldDistribution(
    principal: number,
    annualRate: number,
    frequency: 'monthly' | 'quarterly'
): {
    periodsPerYear: number;
    ratePerPeriod: number;
    amountPerPeriod: number;
    totalAnnualAmount: number;
} {
    const periodsPerYear = frequency === 'monthly' ? 12 : 4;
    const ratePerPeriod = annualRate / periodsPerYear / 100; // Convert percentage to decimal and divide by periods
    const amountPerPeriod = principal * ratePerPeriod;
    const totalAnnualAmount = amountPerPeriod * periodsPerYear;

    return {
        periodsPerYear,
        ratePerPeriod: ratePerPeriod * 100, // Return as percentage
        amountPerPeriod,
        totalAnnualAmount
    };
}

export function calculateTokenPrice(assetValue: number, tokenSupply: number): number {
    return assetValue / tokenSupply;
}

export function calculateTokensFromInvestment(investmentAmount: number, assetValue: number, tokenSupply: number): number {
    const pricePerToken = calculateTokenPrice(assetValue, tokenSupply);
    return investmentAmount / pricePerToken;
}

export function calculateInvestmentFromTokens(tokenAmount: number, assetValue: number, tokenSupply: number): number {
    const pricePerToken = calculateTokenPrice(assetValue, tokenSupply);
    return tokenAmount * pricePerToken;
}

export function calculateYieldOnInvestment(
    investmentAmount: number,
    annualYieldRate: number,
    frequency: 'monthly' | 'quarterly'
): {
    annualYield: number;
    periodicYield: number;
    periodsPerYear: number;
} {
    const periodsPerYear = frequency === 'monthly' ? 12 : 4;
    const annualYield = investmentAmount * (annualYieldRate / 100);
    const periodicYield = annualYield / periodsPerYear;

    return {
        annualYield,
        periodicYield,
        periodsPerYear
    };
}

export function calculateCompoundYield(
    principal: number,
    annualRate: number,
    years: number,
    compoundingFrequency: number = 1
): {
    finalAmount: number;
    totalGain: number;
    effectiveAnnualRate: number;
} {
    const rate = annualRate / 100;
    const finalAmount = principal * Math.pow(1 + rate / compoundingFrequency, compoundingFrequency * years);
    const totalGain = finalAmount - principal;
    const effectiveAnnualRate = Math.pow(finalAmount / principal, 1 / years) - 1;

    return {
        finalAmount,
        totalGain,
        effectiveAnnualRate: effectiveAnnualRate * 100
    };
}

export function calculateBreakEvenPrice(
    initialInvestment: number,
    annualYield: number,
    holdingPeriodYears: number
): number {
    const totalYieldReceived = initialInvestment * (annualYield / 100) * holdingPeriodYears;
    return Math.max(0, initialInvestment - totalYieldReceived);
}

export function calculateAnnualizedReturn(
    initialValue: number,
    finalValue: number,
    holdingPeriodYears: number
): number {
    if (holdingPeriodYears <= 0 || initialValue <= 0) return 0;
    return (Math.pow(finalValue / initialValue, 1 / holdingPeriodYears) - 1) * 100;
}

export function calculatePortfolioMetrics(
    investments: Array<{
        amount: number;
        currentValue: number;
        annualYield: number;
        weight?: number;
    }>
): {
    totalInvestment: number;
    currentValue: number;
    totalReturn: number;
    totalReturnPercentage: number;
    weightedAverageYield: number;
    diversificationRatio: number;
} {
    const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const currentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalReturn = currentValue - totalInvestment;
    const totalReturnPercentage = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;

    // Calculate weighted average yield
    const weightedAverageYield = investments.reduce((sum, inv) => {
        const weight = inv.weight || (inv.amount / totalInvestment);
        return sum + (inv.annualYield * weight);
    }, 0);

    // Simple diversification ratio (number of investments / concentration)
    const diversificationRatio = investments.length > 0 ? investments.length / Math.max(1, investments.length) : 0;

    return {
        totalInvestment,
        currentValue,
        totalReturn,
        totalReturnPercentage,
        weightedAverageYield,
        diversificationRatio
    };
}

export function calculateTransactionFees(
    numberOfTransactions: number,
    feePerTransaction: number = 0.000012 // XRPL standard fee in XRP
): {
    totalFees: number;
    feePerTransaction: number;
    feesInDrops: number;
} {
    const totalFees = numberOfTransactions * feePerTransaction;
    const feesInDrops = totalFees * 1000000; // Convert XRP to drops

    return {
        totalFees,
        feePerTransaction,
        feesInDrops
    };
}
