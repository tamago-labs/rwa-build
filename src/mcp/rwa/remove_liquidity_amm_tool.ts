import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";
import { AMMWithdraw, xrpToDrops } from 'xrpl';

// NOT TESTED YET

export const RemoveLiquidityAMMTool: McpTool = {
    name: "rwa_remove_liquidity_amm",
    description: "Remove liquidity from an AMM pool by redeeming LP tokens",
    schema: {
        token_id: z.string()
            .regex(/^[A-Z0-9]{3}\.r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
            .describe("Token ID in format 'CURRENCY.ISSUER' (e.g., 'PAT.rHJZf5qYxwH2Fnms1Uwmi61VfHqoTALgXw')"),
        withdrawal_type: z.enum(['both_assets', 'single_asset_token', 'single_asset_xrp', 'lp_tokens_amount'])
            .default('both_assets')
            .describe("Type of withdrawal: both assets (proportional), single asset, or specify LP token amount"),
        lp_tokens_amount: z.number()
            .positive()
            .optional()
            .describe("Amount of LP tokens to redeem (required for lp_tokens_amount type)"),
        token_amount_out: z.number()
            .positive()
            .optional()
            .describe("Desired amount of tokens to receive (for single_asset_token)"),
        xrp_amount_out: z.number()
            .positive()
            .optional()
            .describe("Desired amount of XRP to receive (for single_asset_xrp)"),
        percentage_to_withdraw: z.number()
            .min(0.1)
            .max(100)
            .optional()
            .describe("Percentage of your LP position to withdraw (1-100%)"),
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
                throw new Error(`No AMM found for ${currency}/XRP pair.`);
            }

            const amm = ammInfo.result.amm;
            const tokenPool = parseFloat(amm.amount.value);
            const xrpPool = Number(amm.amount2) / 1000000; // Convert drops to XRP
            const totalLPTokens = parseFloat(amm.lp_token.value);

            // Check user's LP token balance
            const balances = await agent.getRWATokenBalances();
            const userLPBalance = balances.rwa_tokens.find(
                token => token.currency === amm.lp_token.currency && token.issuer === amm.lp_token.issuer
            )?.balance || 0;

            if (userLPBalance === 0) {
                throw new Error(`You don't have any LP tokens for ${currency}/XRP pool. Add liquidity first.`);
            }

            // Calculate LP tokens to redeem based on input
            let lpTokensToRedeem = 0;

            if (input.withdrawal_type === 'lp_tokens_amount') {
                if (!input.lp_tokens_amount) {
                    throw new Error("lp_tokens_amount required for this withdrawal type");
                }
                lpTokensToRedeem = input.lp_tokens_amount;
            } else if (input.percentage_to_withdraw) {
                lpTokensToRedeem = (input.percentage_to_withdraw / 100) * userLPBalance;
            } else {
                // Default to withdrawing all LP tokens for proportional withdrawal
                lpTokensToRedeem = userLPBalance;
            }

            if (lpTokensToRedeem > userLPBalance) {
                throw new Error(`Insufficient LP tokens. Available: ${userLPBalance}, Requested: ${lpTokensToRedeem}`);
            }

            // Calculate expected outputs
            const withdrawalRatio = lpTokensToRedeem / totalLPTokens;
            const expectedTokenOut = tokenPool * withdrawalRatio;
            const expectedXRPOut = xrpPool * withdrawalRatio;

            // Validate single asset withdrawal requests
            if (input.withdrawal_type === 'single_asset_token' && input.token_amount_out) {
                if (input.token_amount_out > expectedTokenOut * 1.1) { // Allow 10% buffer
                    throw new Error(`Requested token amount too high. Maximum available: ~${expectedTokenOut.toFixed(6)}`);
                }
            } else if (input.withdrawal_type === 'single_asset_xrp' && input.xrp_amount_out) {
                if (input.xrp_amount_out > expectedXRPOut * 1.1) {
                    throw new Error(`Requested XRP amount too high. Maximum available: ~${expectedXRPOut.toFixed(6)}`);
                }
            }

            // Prepare AMMWithdraw transaction
            let ammWithdraw: AMMWithdraw = {
                TransactionType: 'AMMWithdraw',
                Account: agent.wallet.address,
                Asset: {
                    currency: currency,
                    issuer: issuer
                },
                Asset2: {
                    currency: "XRP"
                },
                LPTokenIn: {
                    currency: amm.lp_token.currency,
                    issuer: amm.lp_token.issuer,
                    value: lpTokensToRedeem.toString()
                },
                Fee: '12'
            };

            // Set flags and amounts based on withdrawal type
            if (input.withdrawal_type === 'both_assets') {
                ammWithdraw.Flags = 0x00100000; // tfTwoAsset
                // For proportional withdrawal, amounts are calculated automatically
            } else if (input.withdrawal_type === 'single_asset_token') {
                ammWithdraw.Flags = 0x00080000; // tfSingleAsset
                ammWithdraw.Amount = {
                    currency: currency,
                    issuer: issuer,
                    value: (input.token_amount_out || expectedTokenOut).toString()
                };
            } else if (input.withdrawal_type === 'single_asset_xrp') {
                ammWithdraw.Flags = 0x00080000; // tfSingleAsset
                ammWithdraw.Amount2 = xrpToDrops(input.xrp_amount_out || expectedXRPOut);
            } else if (input.withdrawal_type === 'lp_tokens_amount') {
                ammWithdraw.Flags = 0x00200000; // tfLPToken
            }

            // Submit the transaction
            const result: any = await agent.client.submitAndWait(ammWithdraw, { wallet: agent.wallet });

            if (result.result.meta?.TransactionResult !== 'tesSUCCESS') {
                throw new Error(`Liquidity removal failed: ${result.result.meta?.TransactionResult}`);
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

            // Calculate actual amounts received (would need to parse from transaction metadata)
            const actualTokenReceived = tokenPool - newTokenPool;
            const actualXRPReceived = xrpPool - newXRPPool;

            // Get updated user balances
            const updatedBalances = await agent.getRWATokenBalances();
            const newUserLPBalance = updatedBalances.rwa_tokens.find(
                token => token.currency === amm.lp_token.currency && token.issuer === amm.lp_token.issuer
            )?.balance || 0;

            // Calculate new pool share
            const newPoolShare = newTotalLPTokens > 0 ? (newUserLPBalance / newTotalLPTokens) * 100 : 0;

            // Calculate withdrawal fee (for single asset withdrawals)
            const tradingFeeRate = amm.trading_fee / 100000;
            const withdrawalFee = input.withdrawal_type.includes('single_asset') ? 
                `~${(withdrawalRatio * tradingFeeRate * 100).toFixed(4)}%` : "None (balanced withdrawal)";

            return {
                status: "success",
                message: `✅ Successfully removed liquidity from ${currency}/XRP pool`,
                transaction_info: {
                    hash: result.result.hash,
                    ledger_index: result.result.ledger_index,
                    fee_paid: `${Number(ammWithdraw.Fee) / 1000000} XRP`,
                    validated: result.result.validated
                },
                withdrawal_details: {
                    withdrawal_type: input.withdrawal_type,
                    lp_tokens_redeemed: lpTokensToRedeem,
                    tokens_received: actualTokenReceived > 0 ? `${actualTokenReceived.toFixed(6)} ${currency}` : "0",
                    xrp_received: actualXRPReceived > 0 ? `${actualXRPReceived.toFixed(6)} XRP` : "0",
                    withdrawal_fee: withdrawalFee
                },
                pool_metrics: {
                    before: {
                        token_pool: `${tokenPool} ${currency}`,
                        xrp_pool: `${xrpPool} XRP`,
                        total_lp_tokens: totalLPTokens,
                        your_lp_balance: userLPBalance,
                        your_pool_share: `${(userLPBalance / totalLPTokens * 100).toFixed(4)}%`
                    },
                    after: {
                        token_pool: `${newTokenPool} ${currency}`,
                        xrp_pool: `${newXRPPool} XRP`,
                        total_lp_tokens: newTotalLPTokens,
                        your_lp_balance: newUserLPBalance,
                        your_pool_share: `${newPoolShare.toFixed(4)}%`
                    }
                },
                impact_analysis: {
                    pool_liquidity_change: `${((newTotalLPTokens - totalLPTokens) / totalLPTokens * 100).toFixed(2)}%`,
                    price_impact: `${(Math.abs((newXRPPool / newTokenPool) - (xrpPool / tokenPool)) / (xrpPool / tokenPool) * 100).toFixed(4)}%`,
                    remaining_position_value: newUserLPBalance > 0 ? 
                        `~${((newUserLPBalance / newTotalLPTokens) * (newTokenPool + newXRPPool)).toFixed(2)} units` : "0"
                },
                earnings_summary: {
                    trading_fees_earned: "Calculate based on historical activity",
                    impermanent_loss_realized: input.withdrawal_type === 'both_assets' ? 
                        "Proportional to price changes since deposit" : "Additional loss from single asset withdrawal",
                    net_position_change: "Compare initial deposit value vs current withdrawal value"
                },
                next_steps: [
                    newUserLPBalance > 0 ? "Monitor remaining LP position" : "Position fully closed",
                    "Track received assets in your wallet",
                    "Consider tax implications of LP token redemption",
                    actualTokenReceived > 0 ? `Manage received ${currency} tokens` : "",
                    actualXRPReceived > 0 ? `Utilize received XRP` : ""
                ].filter(step => step),
                warnings: [
                    input.withdrawal_type.includes('single_asset') ? "⚠️ Single asset withdrawal incurred trading fees" : "",
                    "⚠️ Impermanent loss may have occurred since initial deposit",
                    newUserLPBalance === 0 ? "⚠️ No remaining LP position - consider re-entering if profitable" : ""
                ].filter(w => w)
            };

        } catch (error: any) {
            throw new Error(`Failed to remove liquidity from AMM: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
