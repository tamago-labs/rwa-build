import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const GetAssetInfoTool: McpTool = {
    name: "rwa_get_asset_info",
    description: "Retrieve detailed information about a tokenized RWA asset with comprehensive balance analysis",
    schema: {
        asset_id: z.string()
            .describe("Asset ID in format 'CURRENCY.ISSUER'"),
        include_holders: z.boolean()
            .optional()
            .describe("Include detailed holder information (default: false)")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            const assetId = input.asset_id;
            const includeHolders = input.include_holders || false;
            
            // Get basic asset info
            const assetInfo = await agent.getAssetInfo(assetId);
            
            if (!assetInfo) {
                return {
                    status: "error",
                    message: `Asset ${assetId} not found`,
                    suggestion: "Verify the asset ID format (CURRENCY.ISSUER) and ensure the asset has been tokenized"
                };
            }

            // Get issuer account info
            const walletInfo = await agent.getWalletInfo();
            
            const [currency, issuer] = assetId.split('.');

            // Get actual token supply information from XRPL
            const supplyInfo = await agent.getActualTokenSupply(assetId);

            // Get comprehensive RWA token balances for the current wallet
            const rwaBalances = await agent.getRWATokenBalances();

            // Filter for this specific asset in the wallet
            const thisAssetBalance = rwaBalances.rwa_tokens.find(token => token.asset_id === assetId);

            // Get token holders if requested
            let holdersInfo = null;
            if (includeHolders) {
                const holders = await agent.getTokenHolders(assetId);
                holdersInfo = {
                    total_holders: holders.length,
                    top_holders: holders.slice(0, 10), // Top 10 holders
                    holder_distribution: {
                        whale_holders: holders.filter(h => h.percentage >= 10).length,
                        major_holders: holders.filter(h => h.percentage >= 1 && h.percentage < 10).length,
                        retail_holders: holders.filter(h => h.percentage < 1).length
                    }
                };
            }

            return {
                status: "success",
                message: `✅ Comprehensive asset information retrieved for ${assetId}`,
                
                // Basic Asset Information
                asset_details: {
                    asset_id: assetId,
                    asset_name: assetInfo.name,
                    asset_type: assetInfo.type,
                    token_symbol: assetInfo.tokenSymbol,
                    total_value: assetInfo.totalValue ? `$${assetInfo.totalValue.toLocaleString()}` : "Not set",
                    planned_supply: assetInfo.totalSupply ? `${assetInfo.totalSupply.toLocaleString()} tokens` : "Not set",
                    yield_rate: assetInfo.yieldRate ? `${assetInfo.yieldRate}% annually` : "No yield configured",
                    price_per_token: assetInfo.totalValue && assetInfo.totalSupply ? 
                        `$${(assetInfo.totalValue / assetInfo.totalSupply).toFixed(2)}` : "Not calculated"
                },

                // Live XRPL Token Supply Data (following XRPL dev portal patterns)
                live_supply_data: {
                    actual_total_issued: `${supplyInfo.totalIssued.toLocaleString()} tokens`,
                    circulating_supply: `${supplyInfo.circulatingSupply.toLocaleString()} tokens`,
                    issuer_reserve: `${supplyInfo.issuerBalance.toLocaleString()} tokens`,
                    active_holders: supplyInfo.holderCount,
                    supply_utilization: assetInfo.totalSupply > 0 ? 
                        `${((supplyInfo.totalIssued / assetInfo.totalSupply) * 100).toFixed(1)}%` : "N/A"
                },

                // Current Wallet Holdings for this Asset
                wallet_holdings: thisAssetBalance ? {
                    your_balance: `${thisAssetBalance.balance.toLocaleString()} ${currency}`,
                    estimated_value: thisAssetBalance.estimated_value ? 
                        `$${thisAssetBalance.estimated_value.toLocaleString()}` : "Not available",
                    ownership_percentage: supplyInfo.circulatingSupply > 0 ? 
                        `${((thisAssetBalance.balance / supplyInfo.circulatingSupply) * 100).toFixed(3)}%` : "0%",
                    trustline_limit: thisAssetBalance.limit || "No limit set"
                } : {
                    your_balance: "0 tokens",
                    status: "No trustline established",
                    action_needed: "Create trustline to hold this RWA token"
                },

                // Technical XRPL Information
                token_technical_info: {
                    currency_code: currency,
                    issuer_address: issuer,
                    issuer_xrp_balance: `${Number(walletInfo.account_data.Balance) / 1000000} XRP`,
                    account_sequence: walletInfo.account_data.Sequence,
                    network: agent.network,
                    ledger_flags: walletInfo.account_data.Flags,
                    owner_count: walletInfo.account_data.OwnerCount
                },

                // RWA Portfolio Context
                portfolio_context: {
                    total_rwa_tokens_in_wallet: rwaBalances.rwa_tokens.filter(t => t.is_rwa_token).length,
                    total_portfolio_value: `$${rwaBalances.total_rwa_value.toLocaleString()}`,
                    portfolio_health: rwaBalances.portfolio_summary.portfolio_health,
                    diversification: rwaBalances.portfolio_summary.diversification
                },

                // Trading and Liquidity Information
                trading_info: {
                    tradeable: "Ready for peer-to-peer transfers",
                    exchange_support: "Compatible with XRPL DEX and AMM",
                    minimum_trade: "1 token (divisible to 15 decimal places)",
                    liquidity_status: supplyInfo.holderCount > 1 ? "Multiple holders" : "Single holder",
                    market_depth: `${supplyInfo.holderCount} active participants`
                },

                // Compliance and Regulatory
                compliance_status: {
                    issuer_flags: "Standard XRPL issuer account",
                    transfer_restrictions: "Configurable via trustline flags",
                    regulatory_framework: "Depends on asset type and jurisdiction",
                    accredited_only: assetInfo.totalValue ? "Check asset metadata" : "Unknown"
                },

                // Include holders information if requested
                ...(holdersInfo && { token_holders: holdersInfo }),

                // Useful Next Actions
                useful_operations: [
                    !thisAssetBalance ? "Create trustline to hold this RWA token" : null,
                    "Set up yield distribution if income-generating asset",
                    "Configure trading pairs on XRPL DEX",
                    "Monitor token holder analytics",
                    "Generate XRPL Meta TOML file for listings"
                ].filter(Boolean),

                // Advanced Analytics
                analytics: {
                    tokenization_health: {
                        metadata_available: !!assetInfo.totalValue,
                        supply_consistency: supplyInfo.totalIssued > 0 ? "✅ Tokens issued" : "⚠️ No tokens issued",
                        holder_growth: supplyInfo.holderCount > 1 ? "✅ Multiple holders" : "📈 Growth opportunity",
                        value_tracking: assetInfo.totalValue ? "✅ Asset valued" : "⚠️ Needs valuation"
                    },
                    market_indicators: {
                        distribution_score: supplyInfo.holderCount > 0 ? 
                            Math.min(100, (supplyInfo.holderCount / 50) * 100).toFixed(0) + "/100" : "0/100",
                        liquidity_score: supplyInfo.circulatingSupply > 0 ? "Active" : "Dormant",
                        adoption_phase: supplyInfo.holderCount === 0 ? "Pre-launch" :
                                       supplyInfo.holderCount < 5 ? "Early" :
                                       supplyInfo.holderCount < 20 ? "Growing" : "Mature"
                    }
                }
            };
        } catch (error: any) {
            throw new Error(`Failed to get comprehensive asset info: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
