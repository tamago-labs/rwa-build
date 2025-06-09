export function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

export function formatNumber(amount: number): string {
    return new Intl.NumberFormat('en-US').format(amount);
}

export function formatPercentage(rate: number): string {
    return `${rate.toFixed(2)}%`;
}

export function formatXRP(amount: number): string {
    return `${amount.toFixed(6)} XRP`;
}

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

export function formatAssetType(type: string): string {
    const typeMap: Record<string, string> = {
        'real_estate': 'Real Estate',
        'treasury': 'Treasury Bills/Bonds',
        'commodity': 'Commodity',
        'bond': 'Corporate Bond'
    };
    return typeMap[type] || type;
}

export function formatYieldType(type: string): string {
    const yieldMap: Record<string, string> = {
        'rental': 'Rental Income',
        'interest': 'Interest Payment',
        'dividend': 'Dividend Payment'
    };
    return yieldMap[type] || type;
}

export function formatFrequency(frequency: string): string {
    const frequencyMap: Record<string, string> = {
        'monthly': 'Monthly',
        'quarterly': 'Quarterly'
    };
    return frequencyMap[frequency] || frequency;
}

export function formatDistributionSchedule(rate: number, frequency: string): string {
    const periodsPerYear = frequency === 'monthly' ? 12 : 4;
    const ratePerPeriod = rate / periodsPerYear;
    return `${formatPercentage(ratePerPeriod)} per ${frequency} payment (${formatPercentage(rate)} annually)`;
}

export function formatTokenInfo(symbol: string, supply: number, value: number): string {
    const pricePerToken = value / supply;
    return `${formatNumber(supply)} ${symbol} tokens at ${formatCurrency(pricePerToken)} each`;
}

export function formatComplianceLevel(accreditedOnly: boolean): string {
    return accreditedOnly 
        ? "🔒 Accredited Investors Only (Regulation D)"
        : "🌐 General Public (Subject to registration requirements)";
}

export function formatTransactionHash(hash: string): string {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}

export function formatSuccessRate(successful: number, total: number): string {
    const rate = (successful / total) * 100;
    const emoji = rate === 100 ? "✅" : rate >= 80 ? "⚠️" : "❌";
    return `${emoji} ${rate.toFixed(1)}% (${successful}/${total})`;
}

export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
    if (address.length <= startChars + endChars) {
        return address;
    }
    return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

export function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}
