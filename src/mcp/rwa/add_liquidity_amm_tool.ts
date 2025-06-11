import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";
import { AMMDeposit, xrpToDrops } from 'xrpl';

// NOT TESTED YET

export const AddLiquidityAMMTool: McpTool = {
    name: "rwa_add_liquidity_amm",
    description: "Add liquidity to an existing AMM pool and receive LP tokens",
    schema: {
        token_id: z.string()
            .regex(/^[A-Z0-9]{3}\.r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
            .describe("Token ID in format 'CURRENCY.ISSUER' (e.g., 'PAT.rHJZf5qYxwH2Fnms1Uwmi61VfHqoTALgXw')"),
        deposit_type: z.enum(['both_assets', 'single_asset_token', 'single_asset_xrp'])
            .default('both_assets')
            .describe("Type of deposit: both assets (balanced), single token, or single XRP"),
        token_amount: z.number()
            .positive()
            .optional()
            .describe("Amount of RWA tokens to deposit (required for both_assets and single_asset_token)"),
        xrp_amount: z.number()
            .positive()
            .optional()
            .describe("Amount of XRP to deposit (required for both_assets and single_asset_xrp)"),
        lp_tokens_out: z.number()
            .positive()
            .optional()
            .describe("Exact amount of LP tokens to receive (alternative to specifying amounts)"),
        slippage_tolerance: z.number()
            .min(0.1)
            .max(50)
            .default(2.0)
            .describe("Maximum acceptable slippage percentage (default: 2%)")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            // Parse token ID
            const [currency, issuer] = input.token_id.split('.');

            // Check if AMM exists for this pair
            let ammInfo: any;
            try {
                ammInfo = await agent.client.request({
                    command: 'amm_info',
                    asset: {
                        currency: currency,
                        issuer: issuer
                    },
                    asset2: {
                        currency: "XRP"
                    }
                });
            } catch (error: any) {
                throw new Error(`No AMM found for ${currency}/XRP pair. Create an AMM first.`);
            }

            const amm = ammInfo.result.amm;
            const tokenPool = parseFloat(amm.amount.value);
            const xrpPool = Number(amm.amount2) / 1000000; // Convert drops to XRP
            const totalLPTokens = parseFloat(amm.lp_token.value);

            // Validate user balances
            const balances = await agent.getRWATokenBalances();
            const userTokenBalance = balances.rwa_tokens.find(
                token => token.currency === currency && token.issuer === issuer
            )?.balance || 0;
            const userXRPBalance = balances.xrp_balance;

            // Validate inputs based on deposit type
            if (input.deposit_type === 'both_assets') {
                if (!input.token_amount || !input.xrp_amount) {
                    throw new Error("Both token_amount and xrp_amount required for balanced deposit");
                }
                
                if (userTokenBalance < input.token_amount) {
                    throw new Error(`Insufficient token balance. Available: ${userTokenBalance}, Required: ${input.token_amount}`);
                }
                
                if (userXRPBalance < (input.xrp_amount + 11)) { // Reserve 11 XRP for fees/reserves
                    throw new Error(`Insufficient XRP balance. Available: ${userXRPBalance}, Required: ${input.xrp_amount + 11}`);
                }
            } else if (input.deposit_type === 'single_asset_token') {
                if (!input.token_amount) {
                    throw new Error("token_amount required for single token deposit");
                }
                
                if (userTokenBalance < input.token_amount) {
                    throw new Error(`Insufficient token balance. Available: ${userTokenBalance}, Required: ${input.token_amount}`);
                }
            } else if (input.deposit_type === 'single_asset_xrp') {
                if (!input.xrp_amount) {
                    throw new Error("xrp_amount required for single XRP deposit");
                }
                
                if (userXRPBalance < (input.xrp_amount + 11)) {
                    throw new Error(`Insufficient XRP balance. Available: ${userXRPBalance}, Required: ${input.xrp_amount + 11}`);
                }
            }

            // Calculate expected LP tokens based on deposit type
            let expectedLPTokens = 0;
            let depositRatio = 0;

            if (input.deposit_type === 'both_assets') {
                // For balanced deposits: LP tokens proportional to share of pool
                const tokenShare = input.token_amount / tokenPool;
                const xrpShare = input.xrp_amount / xrpPool;
                depositRatio = Math.min(tokenShare, xrpShare); // Use smaller ratio
                expectedLPTokens = depositRatio * totalLPTokens;
            } else {
                // For single asset deposits: use simplified formula (subject to trading fees)
                if (input.deposit_type === 'single_asset_token') {
                    depositRatio = input.token_amount / tokenPool;
                } else {
                    depositRatio = input.xrp_amount / xrpPool;
                }
                // Single asset deposits receive fewer LP tokens due to trading fees
                const tradingFeeRate = amm.trading_fee / 100000;
                expectedLPTokens = (depositRatio * totalLPTokens) * (1 - tradingFeeRate);
            }

            // Prepare AMMDeposit transaction
            let ammDeposit: AMMDeposit = {
                TransactionType: 'AMMDeposit',
                Account: agent.wallet.address,
                Asset: {
                    currency: currency,
                    issuer: issuer
                },
                Asset2: {
                    currency: "XRP"
                },
                Fee: '12'
            };

            // Set flags and amounts based on deposit type
            if (input.deposit_type === 'both_assets') {
                ammDeposit.Flags = 0x00100000; // tfTwoAsset
                ammDeposit.Amount = {
                    currency: currency,
                    issuer: issuer,
                    value: input.token_amount.toString()
                };
                ammDeposit.Amount2 = xrpToDrops(input.xrp_amount);
            } else if (input.deposit_type === 'single_asset_token') {
                ammDeposit.Flags = 0x00080000; // tfSingleAsset
                ammDeposit.Amount = {
                    currency: currency,
                    issuer: issuer,
                    value: input.token_amount.toString()
                };
            } else if (input.deposit_type === 'single_asset_xrp') {
                ammDeposit.Flags = 0x00080000; // tfSingleAsset
                ammDeposit.Amount2 = xrpToDrops(input.xrp_amount);
            }

            // Add LP token expectation if specified
            if (input.lp_tokens_out) {
                ammDeposit.LPTokenOut = {
                    currency: amm.lp_token.currency,
                    issuer: amm.lp_token.issuer,
                    value: input.lp_tokens_out.toString()
                };
            }

            // Submit the transaction
            const result: any = await agent.client.submitAndWait(ammDeposit, { wallet: agent.wallet });

            if (result.result.meta?.TransactionResult !== 'tesSUCCESS') {
                throw new Error(`Liquidity addition failed: ${result.result.meta?.TransactionResult}`);
            }

            // Get updated AMM info
            const updatedAMMInfo: any = await agent.client.request({
                command: 'amm_info',
                asset: {
                    currency: currency,
                    issuer: issuer
                },
                asset2: {
                    currency: "XRP"
                }
            });

            const updatedAMM = updatedAMMInfo.result.amm;
            const newTokenPool = parseFloat(updatedAMM.amount.value);
            const newXRPPool = Number(updatedAMM.amount2) / 1000000;
            const newTotalLPTokens = parseFloat(updatedAMM.lp_token.value);

            // Calculate actual LP tokens received (from transaction metadata)
            let actualLPTokensReceived = 0;
            // This would need to be extracted from transaction metadata
            // For now, estimate based on pool changes
            actualLPTokensReceived = newTotalLPTokens - totalLPTokens;

            // Calculate new pool share
            const newPoolShare = (actualLPTokensReceived / newTotalLPTokens) * 100;

            // Get updated user balances
            const updatedBalances = await agent.getRWATokenBalances();

            return {
                status: "success",
                message: `✅ Successfully added liquidity to ${currency}/XRP pool`,
                transaction_info: {
                    hash: result.result.hash,
                    ledger_index: result.result.ledger_index,
                    fee_paid: `${Number(ammDeposit.Fee) / 1000000} XRP`,
                    validated: result.result.validated
                },
                deposit_details: {
                    deposit_type: input.deposit_type,
                    token_deposited: input.token_amount || 0,
                    xrp_deposited: input.xrp_amount || 0,
                    lp_tokens_received: actualLPTokensReceived,
                    pool_share_percentage: newPoolShare.toFixed(4)
                },
                pool_metrics: {
                    before: {
                        token_pool: `${tokenPool} ${currency}`,
                        xrp_pool: `${xrpPool} XRP`,
                        total_lp_tokens: totalLPTokens,
                        pool_ratio: `1 ${currency} = ${(xrpPool / tokenPool).toFixed(6)} XRP`
                    },
                    after: {
                        token_pool: `${newTokenPool} ${currency}`,
                        xrp_pool: `${newXRPPool} XRP`,
                        total_lp_tokens: newTotalLPTokens,
                        pool_ratio: `1 ${currency} = ${(newXRPPool / newTokenPool).toFixed(6)} XRP`
                    }
                },
                lp_token_info: {
                    currency: amm.lp_token.currency,
                    issuer: amm.lp_token.issuer,
                    your_lp_balance: actualLPTokensReceived,
                    estimated_value: `${((newPoolShare / 100) * (newTokenPool + newXRPPool)).toFixed(2)} units`,
                    voting_power: `${newPoolShare.toFixed(4)}% of pool decisions`
                },
                earnings_potential: {
                    trading_fee_rate: `${amm.trading_fee / 100}%`,
                    estimated_daily_volume: "Monitoring required",
                    projected_yield: "Based on trading activity",
                    impermanent_loss_risk: input.deposit_type === 'both_assets' ? "Low (balanced)" : "Higher (single asset)"
                },
                next_steps: [
                    "Monitor your LP token balance and pool performance",
                    "Track trading fees earned from pool activity", 
                    "Consider rebalancing if pool ratio changes significantly",
                    "Use rwa_remove_liquidity_amm to withdraw when needed"
                ],
                warnings: [
                    "⚠️ Impermanent loss risk due to price volatility",
                    "⚠️ LP tokens can be traded but affect your pool share",
                    input.deposit_type !== 'both_assets' ? "⚠️ Single asset deposits pay trading fees" : ""
                ].filter(w => w)
            };

        } catch (error: any) {
            throw new Error(`Failed to add liquidity to AMM: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
