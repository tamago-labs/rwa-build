import { Client, Wallet, xrpToDrops, TrustSet, AccountSet, Payment } from 'xrpl';
import { getRWAConfig } from '../config';
import { TokenizeAssetInput, TokenizationResult, DistributionResult, YieldDistribution, RWAAsset } from '../types';

export class RWAAgent {
    public client: Client;
    public wallet: Wallet;
    public network: 'testnet' | 'mainnet' | 'devnet';

    constructor() {
        const config = getRWAConfig();
        
        // Initialize XRPL client
        this.client = new Client(config.server);
        this.network = config.network;
        
        // Initialize wallet from seed/private key
        this.wallet = Wallet.fromSeed(config.privateKey);
        
        console.log(`🏗️ RWA Agent initialized on ${this.network}`);
        console.log(`📍 Wallet address: ${this.wallet.address}`);
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
            console.log('✅ Connected to XRPL');
        } catch (error) {
            console.error('❌ Failed to connect to XRPL:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.disconnect();
            console.log('🔌 Disconnected from XRPL');
        } catch (error) {
            console.error('❌ Failed to disconnect:', error);
        }
    }

    async getWalletInfo(): Promise<any> {
        try {
            const response = await this.client.request({
                command: 'account_info',
                account: this.wallet.address,
                ledger_index: 'validated'
            });
            return response.result;
        } catch (error) {
            console.error('Failed to get wallet info:', error);
            throw error;
        }
    }

    async tokenizeAsset(input: TokenizeAssetInput): Promise<TokenizationResult> {
        try {
            // Generate currency code from token symbol
            const currency = input.tokenSymbol.toUpperCase().padEnd(3, '0').substring(0, 3);
            
            // Step 1: Enable issuing capabilities
            const accountSet: AccountSet = {
                TransactionType: 'AccountSet',
                Account: this.wallet.address,
                SetFlag: 8, // asfDefaultRipple flag
                Fee: '12'
            };

            const accountSetResult = await this.client.submitAndWait(accountSet, { wallet: this.wallet });
            console.log(`✅ Account set for issuing: ${accountSetResult.result.hash}`);

            // Step 2: Create the token issuance concept
            // Note: In XRPL, tokens are created when trustlines are established
            // This creates the foundation for token distribution

            return {
                status: 'success',
                tokenId: `${currency}.${this.wallet.address}`,
                currency: currency,
                issuerAddress: this.wallet.address,
                message: `Successfully set up tokenization for ${input.name} (${currency}). Ready for trustline creation and token distribution.`
            };

        } catch (error: any) {
            console.error('Tokenization failed:', error);
            return {
                status: 'error',
                tokenId: '',
                currency: '',
                issuerAddress: this.wallet.address,
                message: `Failed to tokenize asset: ${error.message}`
            };
        }
    }

    async setupYieldDistribution(assetId: string, distribution: YieldDistribution): Promise<any> {
        try {
            // For MVP, this sets up the framework for yield distribution
            // In a full implementation, this would create escrow accounts
            // and automated payment schedules
            
            console.log(`🔧 Setting up ${distribution.type} distribution for ${assetId}`);
            console.log(`📊 Rate: ${distribution.rate}% ${distribution.frequency}`);
            
            return {
                status: 'success',
                message: `Yield distribution configured: ${distribution.rate}% ${distribution.frequency} ${distribution.type} payments`,
                distributionId: `${assetId}-${Date.now()}`,
                nextPayment: this.calculateNextPaymentDate(distribution.frequency)
            };
            
        } catch (error: any) {
            throw new Error(`Failed to setup yield distribution: ${error.message}`);
        }
    }

    async distributeYield(assetId: string, totalAmount: number, holders: string[]): Promise<DistributionResult> {
        try {
            const amountPerHolder = totalAmount / holders.length;
            const transactionHashes: string[] = [];
            let successCount = 0;

            for (const holder of holders) {
                try {
                    const payment: Payment = {
                        TransactionType: 'Payment',
                        Account: this.wallet.address,
                        Destination: holder,
                        Amount: xrpToDrops(amountPerHolder.toString()),
                        Fee: '12'
                    };

                    const result = await this.client.submitAndWait(payment, { wallet: this.wallet });
                    transactionHashes.push(result.result.hash);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to distribute to ${holder}:`, error);
                }
            }

            return {
                status: successCount === holders.length ? 'success' : 'partial',
                totalDistributed: successCount * amountPerHolder,
                recipientCount: successCount,
                transactionHashes,
                message: `Distributed yield to ${successCount}/${holders.length} holders`
            };

        } catch (error: any) {
            return {
                status: 'error',
                totalDistributed: 0,
                recipientCount: 0,
                transactionHashes: [],
                message: `Failed to distribute yield: ${error.message}`
            };
        }
    }

    async getAssetInfo(assetId: string): Promise<RWAAsset | null> {
        try {
            // For MVP, this would retrieve asset information from stored data
            // In a full implementation, this would query on-chain data and metadata
            
            // Parse assetId (format: CURRENCY.ISSUER)
            const [currency, issuer] = assetId.split('.');
            
            return {
                id: assetId,
                type: 'real_estate', // Default for MVP
                name: `Asset ${currency}`,
                totalValue: 0, // Would be retrieved from metadata
                tokenSymbol: currency,
                totalSupply: 0, // Would be calculated from trustlines
                yieldRate: 0 // Would be retrieved from configuration
            };
            
        } catch (error: any) {
            console.error('Failed to get asset info:', error);
            return null;
        }
    }

    private calculateNextPaymentDate(frequency: 'monthly' | 'quarterly'): Date {
        const now = new Date();
        const next = new Date(now);
        
        if (frequency === 'monthly') {
            next.setMonth(next.getMonth() + 1);
        } else {
            next.setMonth(next.getMonth() + 3);
        }
        
        return next;
    }
}
