// import { z } from "zod";
// import { RWAAgent } from "../../agent";
// import { type McpTool } from "../../types";

// export const GetRWABalancesTool: McpTool = {
//     name: "rwa_get_rwa_balances",
//     description: "Get comprehensive RWA token balances and portfolio analysis",
//     schema: {
//         account_address: z.string()
//             .regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
//             .optional()
//             .describe("XRPL address to check (optional, defaults to wallet address)"),
//         include_metadata: z.boolean()
//             .optional()
//             .describe("Include detailed asset metadata for each token (default: true)"),
//         rwa_only: z.boolean()
//             .optional()
//             .describe("Show only confirmed RWA tokens (default: false)")
//     },
//     handler: async (agent: RWAAgent, input: Record<string, any>) => {
//         try {
//             await agent.connect();

//             const targetAddress = input.account_address || agent.wallet.address;
//             const includeMetadata = input.include_metadata !== false; // Default true
//             const rwaOnly = input.rwa_only || false;
//             const isOwnWallet = targetAddress === agent.wallet.address;

//             // Get comprehensive RWA token balances using the new method
//             const rwaBalanceData = await agent.getRWATokenBalances(targetAddress);

//             // Filter tokens if rwa_only is requested
//             const tokensToShow = rwaOnly ? 
//                 rwaBalanceData.rwa_tokens.filter(token => token.is_rwa_token) : 
//                 rwaBalanceData.rwa_tokens;

//             // Format token balances for display (following XRPL dev portal style)
//             const formattedTokens = tokensToShow.map(token => {
//                 const baseInfo = {
//                     currency: token.currency,
//                     issuer: token.issuer,
//                     balance: `${token.balance.toLocaleString()} ${token.currency}`,
//                     asset_id: token.asset_id,
//                     trustline_limit: token.limit || "No limit",
//                     is_rwa_token: token.is_rwa_token ? "✅ Confirmed RWA" : "❓ Unknown/Standard token"
//                 };

//                 // Add metadata if available and requested
//                 if (includeMetadata && token.asset_metadata) {
//                     return {
//                         ...baseInfo,
//                         asset_details: {
//                             name: token.asset_metadata.assetDetails.name,
//                             type: token.asset_metadata.assetDetails.type,
//                             estimated_value: token.estimated_value ? 
//                                 `$${token.estimated_value.toLocaleString()}` : "Not available",
//                             yield_rate: token.asset_metadata.assetDetails.yieldRate ? 
//                                 `${token.asset_metadata.assetDetails.yieldRate}% annually` : "No yield",
//                             tokenization_date: token.asset_metadata.compliance?.tokenizationDate || "Unknown"
//                         },
//                         technical_info: {
//                             quality_in: token.quality_in || 0,
//                             quality_out: token.quality_out || 0,
//                             fee_structure: token.quality_in !== 1000000000 || token.quality_out !== 1000000000 ? 
//                                 "Custom fees applied" : "Standard fees"
//                         }
//                     };
//                 } else if (includeMetadata) {
//                     return {
//                         ...baseInfo,
//                         note: "No RWA metadata found - may be standard XRPL token"
//                     };
//                 }

//                 return baseInfo;
//             });

//             // Calculate portfolio statistics
//             const rwaTokensOnly = rwaBalanceData.rwa_tokens.filter(token => token.is_rwa_token);
//             const totalEstimatedValue = rwaTokensOnly.reduce((sum, token) => 
//                 sum + (token.estimated_value || 0), 0);

//             return {
//                 status: "success",
//                 message: `📊 RWA token balances retrieved for ${targetAddress.substring(0, 8)}...`,
                
//                 // Account Summary (following XRPL pattern)
//                 account_info: {
//                     address: targetAddress,
//                     network: agent.network,
//                     is_own_wallet: isOwnWallet,
//                     scan_timestamp: new Date().toISOString()
//                 },

//                 // XRP Balance (always included as per XRPL examples)
//                 xrp_balance: {
//                     amount: `${rwaBalanceData.xrp_balance.toFixed(6)} XRP`,
//                     drops: (rwaBalanceData.xrp_balance * 1000000).toString(),
//                     available_for_fees: rwaBalanceData.xrp_balance > 1,
//                     reserve_status: rwaBalanceData.xrp_balance >= 10 ? 
//                         "✅ Above reserve requirement" : "⚠️ Below recommended reserve (10 XRP)"
//                 },

//                 // Token Balances (main content, similar to list-account-tokens.js)
//                 token_balances: formattedTokens.length > 0 ? formattedTokens : [],

//                 // Portfolio Analytics
//                 portfolio_summary: {
//                     total_token_types: rwaBalanceData.rwa_tokens.length,
//                     confirmed_rwa_tokens: rwaTokensOnly.length,
//                     estimated_total_value: `$${totalEstimatedValue.toLocaleString()}`,
//                     xrp_balance: `${rwaBalanceData.xrp_balance.toFixed(6)} XRP`,
//                     portfolio_health: rwaBalanceData.portfolio_summary.portfolio_health,
                    
//                     // Asset Type Diversification
//                     asset_diversification: {
//                         real_estate: rwaBalanceData.portfolio_summary.diversification.real_estate,
//                         treasury: rwaBalanceData.portfolio_summary.diversification.treasury,
//                         commodity: rwaBalanceData.portfolio_summary.diversification.commodity,
//                         bond: rwaBalanceData.portfolio_summary.diversification.bond,
//                         other_tokens: rwaBalanceData.rwa_tokens.length - rwaTokensOnly.length
//                     }
//                 },

//                 // Market Insights
//                 market_insights: {
//                     portfolio_maturity: rwaTokensOnly.length === 0 ? "No RWA holdings" :
//                                        rwaTokensOnly.length < 3 ? "Starter portfolio" :
//                                        rwaTokensOnly.length < 10 ? "Diversified portfolio" : "Advanced portfolio",
//                     risk_profile: {
//                         diversification_score: Math.min(100, (rwaTokensOnly.length / 10) * 100).toFixed(0) + "/100",
//                         concentration_risk: rwaTokensOnly.length === 1 ? "High - single asset" :
//                                            rwaTokensOnly.length < 5 ? "Medium - limited diversification" : "Low - well diversified",
//                         liquidity_status: rwaBalanceData.xrp_balance >= 10 ? "Good XRP reserves" : "Consider increasing XRP"
//                     }
//                 },

//                 // Actionable Insights (following XRPL tutorial pattern)
//                 insights: [
//                     `Token Holdings: ${rwaBalanceData.rwa_tokens.length} total (${rwaTokensOnly.length} confirmed RWA)`,
//                     `Portfolio Value: $${totalEstimatedValue.toLocaleString()} in RWA tokens`,
//                     `XRP Balance: ${rwaBalanceData.xrp_balance.toFixed(6)} XRP`,
//                     ...(isOwnWallet ? [
//                         rwaBalanceData.xrp_balance < 1 ? "⚠️ Low XRP - may need funding for transactions" : "✅ Sufficient XRP for operations",
//                         rwaTokensOnly.length === 0 ? "💡 No RWA tokens found - create trustlines to start investing" : 
//                             `📈 ${rwaTokensOnly.length} RWA investments tracked`,
//                         totalEstimatedValue === 0 ? "💰 Token values not calculated - metadata may be missing" :
//                             `💎 Portfolio valued at $${totalEstimatedValue.toLocaleString()}`
//                     ] : [
//                         "📋 External account analysis complete",
//                         `👀 Portfolio visibility: ${rwaTokensOnly.length}/${rwaBalanceData.rwa_tokens.length} tokens identified as RWA`
//                     ])
//                 ],

//                 // Next Steps Recommendations
//                 recommendations: {
//                     immediate_actions: [
//                         ...(rwaBalanceData.xrp_balance < 10 ? ["Fund account with more XRP for transaction fees"] : []),
//                         ...(rwaTokensOnly.length === 0 ? ["Explore available RWA tokens and create trustlines"] : []),
//                         ...(totalEstimatedValue === 0 && rwaTokensOnly.length > 0 ? ["Asset values missing - verify token metadata"] : [])
//                     ],
//                     portfolio_optimization: [
//                         ...(rwaTokensOnly.length === 1 ? ["Consider diversifying across different asset types"] : []),
//                         ...(rwaBalanceData.portfolio_summary.diversification.real_estate === rwaTokensOnly.length && rwaTokensOnly.length > 1 ? 
//                             ["Portfolio concentrated in real estate - consider other asset classes"] : []),
//                         "Monitor yield-generating assets for distribution schedules",
//                         "Set up automated portfolio tracking"
//                     ]
//                 },

//                 // Technical Information (for developers)
//                 technical_summary: {
//                     query_method: "account_lines + metadata parsing",
//                     tokens_scanned: rwaBalanceData.rwa_tokens.length,
//                     metadata_success_rate: rwaTokensOnly.length > 0 ? 
//                         `${((rwaTokensOnly.length / rwaBalanceData.rwa_tokens.length) * 100).toFixed(1)}%` : "0%",
//                     network_calls_made: 2 + rwaBalanceData.rwa_tokens.length, // account_info + account_lines + metadata calls
//                     data_freshness: "Real-time from validated ledger"
//                 }
//             };
//         } catch (error: any) {
//             if (error.message.includes('actNotFound')) {
//                 return {
//                     status: "error",
//                     message: "❌ Account not found",
//                     error_details: {
//                         address: input.account_address,
//                         issue: "Account does not exist on XRPL",
//                         solution: "Check address format or fund account with minimum 10 XRP"
//                     }
//                 };
//             }
//             throw new Error(`Failed to get RWA token balances: ${error.message}`);
//         } finally {
//             await agent.disconnect();
//         }
//     }
// };
