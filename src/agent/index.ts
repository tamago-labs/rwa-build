import { Client, Wallet, AccountSetAsfFlags, AccountSetTfFlags, xrpToDrops, TrustSet, AccountSet, Payment, convertStringToHex, convertHexToString } from 'xrpl';
import { getRWAConfig } from '../config';
import { TokenizeAssetInput, TokenizationResult, DistributionResult, YieldDistribution, RWAAsset } from '../types';
import { createRWAMemo, findRWATokenizationTx, getColdWallet } from '../utils/xrpl_helpers';

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

        console.error(`🏗️ RWA Agent initialized on ${this.network}`);
        console.error(`📍 Wallet address: ${this.wallet.address}`);
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
            console.error('✅ Connected to XRPL');
        } catch (error) {
            console.error('❌ Failed to connect to XRPL:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            await this.client.disconnect();
            console.error('🔌 Disconnected from XRPL');
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

    //     async distributeYield(assetId: string, totalAmount: number, holders: string[]): Promise<DistributionResult> {
    //         try {
    //             const amountPerHolder = totalAmount / holders.length;
    //             const transactionHashes: string[] = [];
    //             let successCount = 0;

    //             for (const holder of holders) {
    //                 try {
    //                     const payment: Payment = {
    //                         TransactionType: 'Payment',
    //                         Account: this.wallet.address,
    //                         Destination: holder,
    //                         Amount: xrpToDrops(amountPerHolder.toString()),
    //                         Fee: '12'
    //                     };

    //                     const result = await this.client.submitAndWait(payment, { wallet: this.wallet });
    //                     transactionHashes.push(result.result.hash);
    //                     successCount++;
    //                 } catch (error) {
    //                     console.error(`Failed to distribute to ${holder}:`, error);
    //                 }
    //             }

    //             return {
    //                 status: successCount === holders.length ? 'success' : 'partial',
    //                 totalDistributed: successCount * amountPerHolder,
    //                 recipientCount: successCount,
    //                 transactionHashes,
    //                 message: `Distributed yield to ${successCount}/${holders.length} holders`
    //             };

    //         } catch (error: any) {
    //             return {
    //                 status: 'error',
    //                 totalDistributed: 0,
    //                 recipientCount: 0,
    //                 transactionHashes: [],
    //                 message: `Failed to distribute yield: ${error.message}`
    //             };
    //         }
    //     }

    //     // Helper method to retrieve asset metadata from transaction history
    //     async getAssetMetadataFromMemos(assetId: string): Promise<any> {
    //         try {
    //             const [currency, issuer] = assetId.split('.');

    //             // Get transaction history for the issuer
    //             const transactions = await this.client.request({
    //                 command: 'account_tx',
    //                 account: issuer,
    //                 limit: 100, // Look through recent transactions
    //                 ledger_index_min: -1,
    //                 ledger_index_max: -1
    //             });

    //             // Use helper function to find RWA tokenization transaction
    //             return findRWATokenizationTx(transactions.result.transactions, currency);

    //         } catch (error: any) {
    //             console.error('Failed to retrieve asset metadata:', error);
    //             return null;
    //         }
    //     }

    //     async getAssetInfo(assetId: string): Promise<RWAAsset | null> {
    //         try {
    //             // First, try to get metadata from memos
    //             const metadata = await this.getAssetMetadataFromMemos(assetId);

    //             if (metadata) {
    //                 return {
    //                     id: assetId,
    //                     type: metadata.assetDetails.type,
    //                     name: metadata.assetDetails.name,
    //                     totalValue: metadata.assetDetails.totalValue,
    //                     tokenSymbol: metadata.assetDetails.tokenSymbol,
    //                     totalSupply: metadata.assetDetails.totalSupply,
    //                     yieldRate: metadata.assetDetails.yieldRate
    //                 };
    //             }

    //             // Fallback: parse asset ID for basic info
    //             const [currency, issuer] = assetId.split('.');

    //             // Get basic account information
    //             const accountInfo = await this.client.request({
    //                 command: 'account_info',
    //                 account: issuer,
    //                 ledger_index: 'validated'
    //             });

    //             // Check if Domain field has metadata URL
    //             if (accountInfo.result.account_data.Domain) {
    //                 const domain = convertHexToString(accountInfo.result.account_data.Domain);
    //                 console.error(`📍 Domain found for metadata: ${domain}`);
    //                 // Here you could fetch from the domain URL if needed
    //             }

    //             // Return basic asset information
    //             return {
    //                 id: assetId,
    //                 type: "real_estate", // Would need metadata to determine
    //                 name: `Asset ${currency}`,
    //                 totalValue: 0, // Would need metadata to determine
    //                 tokenSymbol: currency,
    //                 totalSupply: 0, // Would need to calculate from trustlines
    //                 yieldRate: 0 // Would need metadata to determine
    //             };

    //         } catch (error: any) {
    //             console.error('Failed to get asset info:', error);
    //             return null;
    //         }
    //     }

    //     // NEW METHOD: Issue tokens to specific investors
    //     async issueTokensToInvestors(
    //         assetId: string, 
    //         distributions: Array<{address: string, amount: number}>
    //     ): Promise<any> {
    //         try {
    //             const [currency, issuer] = assetId.split('.');
    //             const results = [];

    //             console.error(`💰 Issuing ${currency} tokens to ${distributions.length} investors...`);

    //             for (const distribution of distributions) {
    //                 try {
    //                     const payment: Payment = {
    //                         TransactionType: 'Payment',
    //                         Account: this.wallet.address,
    //                         Destination: distribution.address,
    //                         Amount: {
    //                             currency: currency,
    //                             issuer: this.wallet.address,
    //                             value: distribution.amount.toString()
    //                         },
    //                         Fee: '12'
    //                     };

    //                     const result = await this.client.submitAndWait(payment, { wallet: this.wallet });
    //                     results.push({
    //                         address: distribution.address,
    //                         amount: distribution.amount,
    //                         hash: result.result.hash,
    //                         status: 'success'
    //                     });

    //                     console.error(`✅ Sent ${distribution.amount} ${currency} to ${distribution.address.substring(0, 8)}...`);

    //                 } catch (error: any) {
    //                     results.push({
    //                         address: distribution.address,
    //                         amount: distribution.amount,
    //                         status: 'failed',
    //                         error: error.message
    //                     });
    //                     console.error(`❌ Failed to send to ${distribution.address}: ${error.message}`);
    //                 }
    //             }

    //             const successCount = results.filter(r => r.status === 'success').length;

    //             return {
    //                 status: successCount === distributions.length ? 'success' : 'partial',
    //                 message: `Issued tokens to ${successCount}/${distributions.length} investors`,
    //                 distributions: results,
    //                 summary: {
    //                     total_investors: distributions.length,
    //                     successful: successCount,
    //                     failed: distributions.length - successCount,
    //                     total_tokens_distributed: results
    //                         .filter(r => r.status === 'success')
    //                         .reduce((sum, r) => sum + r.amount, 0)
    //                 }
    //             };

    //         } catch (error: any) {
    //             throw new Error(`Failed to issue tokens: ${error.message}`);
    //         }
    //     }

    //     // NEW METHOD: Check actual token supply on XRPL
    //     async getActualTokenSupply(assetId: string): Promise<{
    //         totalIssued: number;
    //         holderCount: number;
    //         issuerBalance: number;
    //         circulatingSupply: number;
    //     }> {
    //         try {
    //             const [currency, issuer] = assetId.split('.');

    //             // Get all account lines for the issuer
    //             const accountLines = await this.client.request({
    //                 command: 'account_lines',
    //                 account: issuer,
    //                 ledger_index: 'validated'
    //             });

    //             let totalIssued = 0;
    //             let holderCount = 0;
    //             let issuerBalance = 0;

    //             // Analyze all trustlines for this currency
    //             for (const line of accountLines.result.lines) {
    //                 if (line.currency === currency) {
    //                     const balance = Math.abs(parseFloat(line.balance));

    //                     if (line.account === issuer) {
    //                         // This is the issuer's own balance
    //                         issuerBalance = balance;
    //                     } else if (balance > 0) {
    //                         // This is a holder with tokens
    //                         totalIssued += balance;
    //                         holderCount++;
    //                     }
    //                 }
    //             }

    //             // Calculate circulating supply (tokens not held by issuer)
    //             const circulatingSupply = totalIssued;

    //             return {
    //                 totalIssued: totalIssued + issuerBalance, // Total tokens created
    //                 holderCount,
    //                 issuerBalance, // Tokens still held by issuer
    //                 circulatingSupply // Tokens held by investors
    //             };

    //         } catch (error: any) {
    //             console.error('Failed to get actual token supply:', error);
    //             return {
    //                 totalIssued: 0,
    //                 holderCount: 0,
    //                 issuerBalance: 0,
    //                 circulatingSupply: 0
    //             };
    //         }
    //     }

    //     // NEW METHOD: Get token holders list
    //     async getTokenHolders(assetId: string): Promise<Array<{
    //         address: string;
    //         balance: number;
    //         percentage: number;
    //     }>> {
    //         try {
    //             const [currency, issuer] = assetId.split('.');
    //             const holders = [];

    //             // Get all accounts that have trustlines to this issuer
    //             const accountLines = await this.client.request({
    //                 command: 'account_lines',
    //                 account: issuer,
    //                 ledger_index: 'validated'
    //             });

    //             let totalSupply = 0;

    //             // First pass: calculate total supply
    //             for (const line of accountLines.result.lines) {
    //                 if (line.currency === currency) {
    //                     const balance = Math.abs(parseFloat(line.balance));
    //                     if (balance > 0) {
    //                         totalSupply += balance;
    //                     }
    //                 }
    //             }

    //             // Second pass: collect holder information
    //             for (const line of accountLines.result.lines) {
    //                 if (line.currency === currency) {
    //                     const balance = Math.abs(parseFloat(line.balance));
    //                     if (balance > 0) {
    //                         holders.push({
    //                             address: line.account,
    //                             balance: balance,
    //                             percentage: totalSupply > 0 ? (balance / totalSupply) * 100 : 0
    //                         });
    //                     }
    //                 }
    //             }

    //             // Sort by balance descending
    //             return holders.sort((a, b) => b.balance - a.balance);

    //         } catch (error: any) {
    //             console.error('Failed to get token holders:', error);
    //             return [];
    //         }
    //     }

    //     // NEW METHOD: Generate XRPL Meta compliant TOML file
    //     generateXRPLMetaToml(input: TokenizeAssetInput, result: TokenizationResult): string {
    //         const meta = input.xrplMeta!;
    //         const pricePerToken = (input.totalValue / input.totalSupply).toFixed(2);
    //         const currentDate = new Date().toISOString();

    //         let tomlContent = `# Generated by RWA.build for ${input.name}
    // # Token: ${input.tokenSymbol} - ${input.name}
    // # Generated: ${currentDate}
    // # XLS-26 Standard Compliant

    // [[ISSUERS]]
    // address = "${this.wallet.address}"
    // name = "RWA Tokenization Platform"
    // description = "Professional real-world asset tokenization on XRPL"

    // [[TOKENS]]
    // issuer = "${this.wallet.address}"
    // currency = "${input.tokenSymbol}"
    // name = "${input.name}"
    // desc = "${meta.tokenDescription}"`;

    //         // Add optional fields
    //         if (meta.icon) {
    //             tomlContent += `\nicon = "${meta.icon}"`;
    //         }

    //         // Add RWA-specific metadata
    //         tomlContent += `\nasset_type = "${input.type}"`;
    //         tomlContent += `\ntotal_value = ${input.totalValue}`;
    //         tomlContent += `\ntotal_supply = ${input.totalSupply}`;
    //         tomlContent += `\nprice_per_token = ${pricePerToken}`;

    //         if (input.yieldRate) {
    //             tomlContent += `\nyield_rate = ${input.yieldRate}`;
    //         }

    //         tomlContent += `\ncompliance_accredited_only = ${input.accreditedOnly || false}`;
    //         tomlContent += `\nrwa_tokenization_platform = "RWA.build"`;

    //         // Add weblinks
    //         if (meta.website) {
    //             tomlContent += `\n\n[[TOKENS.WEBLINKS]]\nurl = "${meta.website}"\ntype = "website"\ntitle = "Official Website"`;
    //         }

    //         if (meta.whitepaper) {
    //             tomlContent += `\n\n[[TOKENS.WEBLINKS]]\nurl = "${meta.whitepaper}"\ntype = "whitepaper"\ntitle = "Investment Documentation"`;
    //         }

    //         if (meta.socialMedia?.twitter) {
    //             tomlContent += `\n\n[[TOKENS.WEBLINKS]]\nurl = "${meta.socialMedia.twitter}"\ntype = "socialmedia"\ntitle = "Twitter"`;
    //         }

    //         if (meta.socialMedia?.telegram) {
    //             tomlContent += `\n\n[[TOKENS.WEBLINKS]]\nurl = "${meta.socialMedia.telegram}"\ntype = "socialmedia"\ntitle = "Telegram"`;
    //         }

    //         if (meta.socialMedia?.discord) {
    //             tomlContent += `\n\n[[TOKENS.WEBLINKS]]\nurl = "${meta.socialMedia.discord}"\ntype = "socialmedia"\ntitle = "Discord"`;
    //         }

    //         // Add platform attribution
    //         tomlContent += `\n\n[[TOKENS.WEBLINKS]]\nurl = "https://rwa.build"\ntype = "platform"\ntitle = "Powered by RWA.build"`;

    //         return tomlContent;
    //     }

    //     private calculateNextPaymentDate(frequency: 'monthly' | 'quarterly'): Date {
    //         const now = new Date();
    //         const next = new Date(now);

    //         if (frequency === 'monthly') {
    //             next.setMonth(next.getMonth() + 1);
    //         } else {
    //             next.setMonth(next.getMonth() + 3);
    //         }

    //         return next;
    //     }

    async tokenizeAsset(input: TokenizeAssetInput): Promise<TokenizationResult> {
        try {

            // Generate currency code from token symbol
            const currency = input.tokenSymbol.toUpperCase().padEnd(3, '0').substring(0, 3);

            // STEP 1: Create asset metadata object
            const assetMetadata = {
                version: "1.0",
                timestamp: Date.now(),
                assetDetails: {
                    name: input.name,
                    type: input.type,
                    totalValue: input.totalValue,
                    tokenSymbol: input.tokenSymbol,
                    totalSupply: input.totalSupply,
                    yieldRate: input.yieldRate || 0,
                    pricePerToken: input.totalValue / input.totalSupply
                },
                compliance: {
                    accreditedOnly: input.accreditedOnly || false,
                    jurisdiction: "US",
                    tokenizationDate: new Date().toISOString()
                },
                issuer: {
                    address: this.wallet.address,
                    network: this.network
                }
            };

            // STEP 2: Create memo with asset metadata using helper function
            const rwaMemo = createRWAMemo(assetMetadata);

            const coldWallet = getColdWallet()

            // STEP 3: Enable issuing capabilities with metadata memo
            const accountSet: AccountSet = {
                TransactionType: 'AccountSet',
                Account: coldWallet.address,
                SetFlag: AccountSetAsfFlags.asfDefaultRipple,
                Flags: (AccountSetTfFlags.tfDisallowXRP | AccountSetTfFlags.tfRequireDestTag),
                Fee: '12',
                Memos: [rwaMemo]
            };

            const accountSetResult = await this.client.submitAndWait(accountSet, { wallet: coldWallet });
            console.error(`✅ Account set for issuing with metadata: ${accountSetResult.result.hash}`);

            // const accountSetResult2 = await this.client.submitAndWait({
            //     "TransactionType": "AccountSet",
            //     "Account": this.wallet.address,
            //     "Domain": "6578616D706C652E636F6D",
            //     "SetFlag": AccountSetAsfFlags.asfRequireAuth,
            //     "Flags": (AccountSetTfFlags.tfDisallowXRP |
            //         AccountSetTfFlags.tfRequireDestTag)
            // }, { wallet: this.wallet });
            // console.error(`✅ Account set for the caller with metadata: ${accountSetResult2.result.hash}`);

            console.error(`🎨 Starting token issuance for ${input.totalSupply} ${currency} tokens...`);

            // Create a trustline to treasury to hold all tokens initially
            const trustline: TrustSet = {
                TransactionType: 'TrustSet',
                Account: this.wallet.address,
                LimitAmount: {
                    currency: currency,
                    issuer: coldWallet.address,
                    value: input.totalSupply.toString()
                },
                Fee: '12'
            };

            const trustlineResult = await this.client.submitAndWait(trustline, { wallet: this.wallet });
            console.error(`✅ Trustline created: ${trustlineResult.result.hash}`);

            // Issue all tokens to issuer (this creates the token supply)
            const issuancePayment: Payment = {
                TransactionType: 'Payment',
                Account: coldWallet.address,
                Destination: this.wallet.address,
                DestinationTag: 1,
                Amount: {
                    currency: currency,
                    issuer: coldWallet.address,
                    value: input.totalSupply.toString()
                },
                Fee: '12'
            };

            const issuanceResult = await this.client.submitAndWait(issuancePayment, { wallet: coldWallet });
            console.error(`✅ ${input.totalSupply} ${currency} tokens issued: ${issuanceResult.result.hash}`);

            let issuanceResults: Array<{ type: string, hash: string, amount: number, destination: string }> = [];

            issuanceResults.push({
                type: 'trustline_creation',
                hash: trustlineResult.result.hash,
                amount: input.totalSupply,
                destination: this.wallet.address
            });

            issuanceResults.push({
                type: 'token_issuance',
                hash: issuanceResult.result.hash,
                amount: input.totalSupply,
                destination: this.wallet.address
            });

            const tokensIssued = true;
            console.error(`✨ SUCCESS: ${input.totalSupply} ${currency} tokens now exist on XRPL!`);

            const tokenizationTxHash = accountSetResult.result.hash;
            const successMessage = `Successfully tokenized and issued ${input.totalSupply} ${currency} tokens for ${input.name}`

            const finalResult: TokenizationResult = {
                status: 'success',
                tokenId: `${currency}.${coldWallet.address}`,
                currency: currency,
                issuerAddress: coldWallet.address,
                message: successMessage,
                metadata: {
                    assetMetadata,
                    tokenizationTxHash,
                    retrievalMethod: "memo_parsing",
                    tokensIssued,
                    issuanceResults: issuanceResults.length > 0 ? issuanceResults : undefined
                }
            };

            return finalResult;

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

}
