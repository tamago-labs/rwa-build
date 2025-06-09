// Core RWA Types

// 🏢 Core Asset Representation
export interface RWAAsset {
  id: string;
  type: 'real_estate' | 'treasury' | 'commodity' | 'bond';
  name: string;
  totalValue: number;
  tokenSymbol: string;
  totalSupply: number;
  yieldRate?: number; // Annual yield percentage
}

// 💰 Yield Distribution (for income-generating assets)
export interface YieldDistribution {
  type: 'rental' | 'interest' | 'dividend';
  frequency: 'monthly' | 'quarterly';
  rate: number; // Annual percentage
  nextPayment?: Date;
}

// 🛒 Simple Trading Configuration
export interface TradingConfig {
  enableTrading: boolean;
  minTradeAmount: number;
  maxHolders?: number; // For compliance
}

// ⚖️ Basic Compliance (US-focused for MVP)
export interface ComplianceConfig {
  accreditedOnly: boolean;
  maxInvestors?: number;
  holdingPeriodDays?: number;
}

// 📊 Transaction Results
export interface TokenizationResult {
  status: 'success' | 'error';
  tokenId: string;
  currency: string;
  issuerAddress: string;
  message: string;
}

export interface DistributionResult {
  status: 'success' | 'partial' | 'error';
  totalDistributed: number;
  recipientCount: number;
  transactionHashes: string[];
  message: string;
}

export interface TradingResult {
  status: 'success' | 'error';
  tradingPairCreated: boolean;
  ammPoolId?: string;
  message: string;
}

// 🔧 MCP Tool Interface
export interface McpTool {
  name: string;
  description: string;
  schema: any;
  handler: (agent: any, input: Record<string, any>) => Promise<any>;
}

// 🏗️ Agent Configuration
export interface RWAConfig {
  privateKey: string;
  network: 'testnet' | 'mainnet' | 'devnet';
  server: string;
}

// 📝 Tokenization Input
export interface TokenizeAssetInput {
  type: 'real_estate' | 'treasury' | 'commodity' | 'bond';
  name: string;
  totalValue: number;
  tokenSymbol: string;
  totalSupply: number;
  yieldRate?: number;
  accreditedOnly?: boolean;
}
