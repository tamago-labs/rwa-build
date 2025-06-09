import { CURRENCY_CODE, COMPLIANCE_LIMITS } from '../constants';

export function validateTokenSymbol(symbol: string): { valid: boolean; error?: string } {
    if (!symbol) {
        return { valid: false, error: "Token symbol is required" };
    }
    
    if (symbol.length !== CURRENCY_CODE.MAX_LENGTH) {
        return { valid: false, error: `Token symbol must be exactly ${CURRENCY_CODE.MAX_LENGTH} characters` };
    }
    
    if (!CURRENCY_CODE.ALLOWED_CHARS.test(symbol)) {
        return { valid: false, error: "Token symbol must contain only uppercase letters and numbers" };
    }
    
    // Reserved symbols
    const reserved = ['XRP', 'USD', 'EUR', 'BTC', 'ETH'];
    if (reserved.includes(symbol.toUpperCase())) {
        return { valid: false, error: `Token symbol '${symbol}' is reserved` };
    }
    
    return { valid: true };
}

export function validateAssetValue(value: number): { valid: boolean; error?: string } {
    if (!value || value <= 0) {
        return { valid: false, error: "Asset value must be positive" };
    }
    
    if (value < 1000) {
        return { valid: false, error: "Minimum asset value is $1,000 for tokenization" };
    }
    
    if (value > 1000000000) { // $1B limit for MVP
        return { valid: false, error: "Asset value exceeds maximum limit of $1B" };
    }
    
    return { valid: true };
}

export function validateTokenSupply(supply: number, value: number): { valid: boolean; error?: string } {
    if (!supply || supply <= 0 || !Number.isInteger(supply)) {
        return { valid: false, error: "Token supply must be a positive integer" };
    }
    
    if (supply < 100) {
        return { valid: false, error: "Minimum token supply is 100 tokens" };
    }
    
    if (supply > 100000000) { // 100M token limit
        return { valid: false, error: "Token supply exceeds maximum limit of 100M tokens" };
    }
    
    // Check minimum price per token
    const pricePerToken = value / supply;
    if (pricePerToken < 0.01) {
        return { valid: false, error: "Price per token too low (minimum $0.01). Reduce token supply or increase asset value." };
    }
    
    return { valid: true };
}

export function validateYieldRate(rate?: number): { valid: boolean; error?: string } {
    if (rate === undefined) {
        return { valid: true }; // Optional field
    }
    
    if (rate < 0) {
        return { valid: false, error: "Yield rate cannot be negative" };
    }
    
    if (rate > 50) {
        return { valid: false, error: "Yield rate cannot exceed 50% annually" };
    }
    
    return { valid: true };
}

export function validateXRPLAddress(address: string): { valid: boolean; error?: string } {
    if (!address) {
        return { valid: false, error: "Address is required" };
    }
    
    // XRPL address validation
    const xrplAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/;
    if (!xrplAddressRegex.test(address)) {
        return { valid: false, error: "Invalid XRPL address format" };
    }
    
    return { valid: true };
}

export function validateComplianceSettings(accreditedOnly: boolean, maxInvestors?: number): { valid: boolean; error?: string } {
    if (maxInvestors !== undefined) {
        if (maxInvestors < 1) {
            return { valid: false, error: "Maximum investors must be at least 1" };
        }
        
        if (!accreditedOnly && maxInvestors > COMPLIANCE_LIMITS.MAX_INVESTORS_UNREGISTERED) {
            return { 
                valid: false, 
                error: `Without accredited investor restriction, maximum investors is ${COMPLIANCE_LIMITS.MAX_INVESTORS_UNREGISTERED} (SEC Rule 506(b))` 
            };
        }
    }
    
    return { valid: true };
}

export function validateDistributionAmount(amount: number, totalSupply: number): { valid: boolean; error?: string } {
    if (!amount || amount <= 0) {
        return { valid: false, error: "Distribution amount must be positive" };
    }
    
    if (amount > 1000000) { // 1M XRP limit for single distribution
        return { valid: false, error: "Distribution amount exceeds 1M XRP limit" };
    }
    
    const amountPerToken = amount / totalSupply;
    if (amountPerToken < 0.000001) { // 1 drop minimum
        return { valid: false, error: "Distribution amount too small - minimum 1 drop per token" };
    }
    
    return { valid: true };
}
