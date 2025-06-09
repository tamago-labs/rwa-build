// XRPL Constants
export const XRPL_NETWORKS = {
    testnet: 'wss://s.altnet.rippletest.net:51233',
    devnet: 'wss://s.devnet.rippletest.net:51233',
    mainnet: 'wss://xrplcluster.com'
} as const;

// RWA Asset Types
export const RWA_ASSET_TYPES = {
    REAL_ESTATE: 'real_estate',
    TREASURY: 'treasury', 
    COMMODITY: 'commodity',
    BOND: 'bond'
} as const;

// Yield Distribution Types
export const YIELD_TYPES = {
    RENTAL: 'rental',
    INTEREST: 'interest',
    DIVIDEND: 'dividend'
} as const;

// Distribution Frequencies
export const DISTRIBUTION_FREQUENCIES = {
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly'
} as const;

// Transaction Fees (in drops - 1 XRP = 1,000,000 drops)
export const TRANSACTION_FEES = {
    STANDARD: '12', // 0.000012 XRP
    TRUSTLINE: '12',
    ESCROW: '12',
    OFFER: '12'
} as const;

// Currency Code Constraints
export const CURRENCY_CODE = {
    MIN_LENGTH: 3,
    MAX_LENGTH: 3,
    ALLOWED_CHARS: /^[A-Z0-9]{3}$/
} as const;

// Compliance Limits
export const COMPLIANCE_LIMITS = {
    MAX_INVESTORS_UNREGISTERED: 99, // SEC limit for unregistered securities
    MIN_ACCREDITED_INVESTMENT: 200000, // Typical accredited investor minimum
    MAX_HOLDING_PERIOD_DAYS: 365 * 2 // 2 years max holding period
} as const;

// Default Values
export const DEFAULTS = {
    MIN_TRADE_AMOUNT: 1,
    MAX_HOLDERS: 99,
    HOLDING_PERIOD_DAYS: 0
} as const;
