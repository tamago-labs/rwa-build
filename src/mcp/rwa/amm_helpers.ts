// AMM Helper Functions based on XRPL Dev Portal examples
// These functions implement the mathematical formulas used by XRPL AMMs

/**
 * Calculate the output amount for a swap using the constant product AMM formula
 * Based on the swapOut function from XRPL dev portal
 * 
 * @param assetOut - Amount of asset to receive
 * @param poolIn - Pool balance of input asset
 * @param poolOut - Pool balance of output asset  
 * @param tradingFee - Trading fee in basis points (e.g., 500 = 0.5%)
 * @returns Amount of input asset needed
 */
export function swapOut(assetOut: number, poolIn: number, poolOut: number, tradingFee: number): number {
    // AMM constant product formula: (poolIn + inputAmount) * (poolOut - outputAmount) = poolIn * poolOut
    // Solving for inputAmount: inputAmount = (assetOut * poolIn) / (poolOut - assetOut)
    
    const inputAmount = (assetOut * poolIn) / (poolOut - assetOut);
    
    // Apply trading fee (fee is paid on the input amount)
    const feeMultiplier = 1 + (tradingFee / 100000);
    
    return inputAmount * feeMultiplier;
}

/**
 * Calculate the output amount for a given input amount
 * 
 * @param assetIn - Amount of asset to send
 * @param poolIn - Pool balance of input asset
 * @param poolOut - Pool balance of output asset
 * @param tradingFee - Trading fee in basis points
 * @returns Amount of output asset to receive
 */
export function swapIn(assetIn: number, poolIn: number, poolOut: number, tradingFee: number): number {
    // Apply trading fee to input amount
    const feeRate = tradingFee / 100000;
    const assetInAfterFee = assetIn * (1 - feeRate);
    
    // AMM constant product formula: assetOut = (assetInAfterFee * poolOut) / (poolIn + assetInAfterFee)
    const assetOut = (assetInAfterFee * poolOut) / (poolIn + assetInAfterFee);
    
    return assetOut;
}

/**
 * Calculate LP tokens received for a deposit
 * 
 * @param depositAmount - Amount being deposited
 * @param poolBalance - Current pool balance of the deposited asset
 * @param totalLPTokens - Total LP tokens in circulation
 * @param isBalancedDeposit - Whether this is a balanced (both assets) deposit
 * @param tradingFee - Trading fee for single asset deposits
 * @returns Amount of LP tokens to receive
 */
export function calculateLPTokensFromDeposit(
    depositAmount: number, 
    poolBalance: number, 
    totalLPTokens: number,
    isBalancedDeposit: boolean = true,
    tradingFee: number = 0
): number {
    if (totalLPTokens === 0) {
        // Initial deposit - use geometric mean
        return Math.sqrt(depositAmount);
    }
    
    // Calculate proportional LP tokens
    const proportionalTokens = (depositAmount / poolBalance) * totalLPTokens;
    
    if (!isBalancedDeposit) {
        // Single asset deposits pay trading fee
        const feeRate = tradingFee / 100000;
        return proportionalTokens * (1 - feeRate);
    }
    
    return proportionalTokens;
}

/**
 * Calculate assets received when redeeming LP tokens
 * 
 * @param lpTokensToRedeem - Amount of LP tokens being redeemed
 * @param totalLPTokens - Total LP tokens in circulation
 * @param pool1Balance - Balance of first asset in pool
 * @param pool2Balance - Balance of second asset in pool
 * @returns [amount1, amount2] - Amounts of each asset to receive
 */
export function calculateAssetsFromLPTokens(
    lpTokensToRedeem: number,
    totalLPTokens: number,
    pool1Balance: number,
    pool2Balance: number
): [number, number] {
    const shareRatio = lpTokensToRedeem / totalLPTokens;
    
    return [
        pool1Balance * shareRatio,
        pool2Balance * shareRatio
    ];
}

/**
 * Calculate price impact of a trade
 * 
 * @param tradeAmount - Amount being traded
 * @param poolBalance - Pool balance of the asset being traded
 * @returns Price impact as a percentage
 */
export function calculatePriceImpact(tradeAmount: number, poolBalance: number): number {
    // Price impact = tradeAmount / (poolBalance + tradeAmount)
    return (tradeAmount / (poolBalance + tradeAmount)) * 100;
}

/**
 * Calculate the minimum bid needed to win an auction slot
 * 
 * @param currentBid - Current winning bid amount
 * @param minimumIncrement - Minimum bid increment (typically 1000 = 0.001%)
 * @returns Minimum bid needed to win
 */
export function calculateMinimumAuctionBid(currentBid: number, minimumIncrement: number = 1000): number {
    return currentBid + (currentBid * minimumIncrement / 100000);
}

/**
 * Format currency amount for display
 * 
 * @param amount - Numeric amount
 * @param currency - Currency code
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export function formatCurrencyAmount(amount: number, currency: string, decimals: number = 6): string {
    return `${amount.toFixed(decimals)} ${currency}`;
}

/**
 * Convert XRP drops to XRP
 * 
 * @param drops - Amount in drops (1 XRP = 1,000,000 drops)
 * @returns Amount in XRP
 */
export function dropsToXRP(drops: string | number): number {
    return Number(drops) / 1000000;
}

/**
 * Convert XRP to drops
 * 
 * @param xrp - Amount in XRP
 * @returns Amount in drops as string
 */
export function xrpToDrops(xrp: number): string {
    return Math.floor(xrp * 1000000).toString();
}

/**
 * Validate AMM asset pair
 * 
 * @param asset1 - First asset (currency code or "XRP")
 * @param asset2 - Second asset (currency code or "XRP") 
 * @returns true if valid pair, throws error if invalid
 */
export function validateAMMAssetPair(asset1: string, asset2: string): boolean {
    // Cannot have two XRP assets
    if (asset1 === "XRP" && asset2 === "XRP") {
        throw new Error("Cannot create AMM with XRP/XRP pair");
    }
    
    // Cannot have identical token pairs
    if (asset1 === asset2) {
        throw new Error("Cannot create AMM with identical assets");
    }
    
    // At most one asset can be XRP (for this simplified implementation)
    const xrpCount = [asset1, asset2].filter(asset => asset === "XRP").length;
    if (xrpCount > 1) {
        throw new Error("At most one asset can be XRP");
    }
    
    return true;
}

/**
 * Generate AMM account address deterministically
 * This is a simplified version - actual XRPL uses more complex hashing
 * 
 * @param asset1Currency - First asset currency code
 * @param asset1Issuer - First asset issuer (undefined for XRP)
 * @param asset2Currency - Second asset currency code  
 * @param asset2Issuer - Second asset issuer (undefined for XRP)
 * @returns Predicted AMM account address
 */
export function generateAMMAccountId(
    asset1Currency: string,
    asset1Issuer: string | undefined,
    asset2Currency: string,
    asset2Issuer: string | undefined
): string {
    // This is a placeholder - actual implementation would use SHA-512Half
    // of the concatenated asset identifiers as specified in XRPL docs
    return `rAMM${asset1Currency}${asset2Currency}${Date.now().toString().slice(-8)}`;
}

/**
 * Constants used in AMM calculations
 */
export const AMM_CONSTANTS = {
    // Minimum AMM creation fee (1 owner reserve)
    MIN_CREATION_FEE_XRP: 0.2,
    
    // Maximum trading fee (1% = 1000 basis points)
    MAX_TRADING_FEE: 1000,
    
    // Default trading fee (0.5% = 500 basis points)
    DEFAULT_TRADING_FEE: 500,
    
    // Minimum bid increment for auction slots
    MIN_BID_INCREMENT: 1000, // 0.001%
    
    // AMM weight parameter (always 0.5 for constant product)
    WEIGHT_PARAMETER: 0.5
};
