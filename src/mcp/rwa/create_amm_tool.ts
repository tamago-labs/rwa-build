import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";
import { AMMCreate, xrpToDrops } from 'xrpl';

export const CreateAMMTool: McpTool = {
    name: "rwa_create_amm",
    description: "Create an Automated Market Maker (AMM) for trading RWA tokens with XRP",
    schema: {
        token_id: z.string()
            .regex(/^[A-Z0-9]{3}\.r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
            .describe("Token ID in format 'CURRENCY.ISSUER' (e.g., 'PAT.rHJZf5qYxwH2Fnms1Uwmi61VfHqoTALgXw')"),
        token_amount: z.number()
            .positive()
            .describe("Amount of RWA tokens to deposit into the AMM pool"),
        xrp_amount: z.number()
            .positive()
            .describe("Amount of XRP to deposit into the AMM pool (should be approximately equal value to token_amount)"),
        trading_fee: z.number()
            .min(0)
            .max(1000)
            .default(500)
            .describe("Trading fee in 1/100,000 units (500 = 0.5%, max 1000 = 1%)")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            // Parse token ID to extract currency and issuer
            const [currency, issuer] = input.token_id.split('.');

            // Validate that the user has sufficient tokens and XRP
            const balances = await agent.getRWATokenBalances();
            const xrpBalance = balances.xrp_balance;
            const tokenBalance = balances.rwa_tokens.find(
                token => token.currency === currency && token.issuer === issuer
            );

            if (!tokenBalance || tokenBalance.balance < input.token_amount) {
                throw new Error(
                    `Insufficient token balance. Available: ${tokenBalance?.balance || 0} ${currency}, Required: ${input.token_amount}`
                );
            }
 
            // Check XRP balance (account for AMM creation cost + pool deposit + reserves)
            const ammCreationCost = 0.2; // Current AMM creation cost
            const totalXRPNeeded = input.xrp_amount + ammCreationCost + 10; // 10 XRP reserve buffer

            if (xrpBalance < totalXRPNeeded) {
                throw new Error(
                    `Insufficient XRP balance. Available: ${xrpBalance} XRP, Required: ${totalXRPNeeded} XRP (includes ${ammCreationCost} XRP creation cost)`
                );
            }

            // Check if AMM already exists for this pair
            // try {
            //     const existingAMM = await agent.client.request({
            //         command: 'amm_info',
            //         asset: {
            //             currency: currency,
            //             issuer: issuer
            //         },
            //         asset2: {
            //             currency: "XRP"
            //         }
            //     });

            //     if (existingAMM.result.amm) {
            //         throw new Error(`AMM already exists for ${currency}/XRP pair. AMM Account: ${existingAMM.result.amm.account}`);
            //     }
            // } catch (error: any) {
            //     // AMM doesn't exist, which is what we want
            //     if (!error.message.includes('actNotFound')) {
            //         throw error;
            //     }
            // }
 
            // Get current server state to determine exact AMM creation cost
            const serverInfo: any = await agent.client.request({
                command: 'server_state'
            });
 

            const amm_fee_drops = serverInfo.result.state.validated_ledger!.reserve_inc.toString()
            const actualCreationCost = amm_fee_drops
 

            // Prepare the AMMCreate transaction
            const ammCreateTx: AMMCreate = {
                TransactionType: 'AMMCreate',
                Account: agent.wallet.address,
                Amount: {
                    currency: currency,
                    issuer: issuer,
                    value: input.token_amount.toString()
                },
                Amount2: xrpToDrops(input.xrp_amount), // Convert XRP to drops
                TradingFee: input.trading_fee,
                Fee: actualCreationCost // Set the actual creation cost
            };

            // Submit the AMM creation transaction
            const result: any = await agent.client.submitAndWait(ammCreateTx, {
                wallet: agent.wallet,
                autofill: true,
                failHard: true
            });
 
            if (result.result.meta?.TransactionResult !== 'tesSUCCESS') {
                throw new Error(`AMM creation failed: ${result.result.meta?.TransactionResult}`);
            }

            // Get the new AMM info
            const ammInfo: any = await agent.client.request({
                command: 'amm_info',
                asset: {
                    currency: currency,
                    issuer: issuer
                },
                asset2: {
                    currency: "XRP"
                }
            });
 

            const amm = ammInfo.result.amm;
            const lpTokens = amm.lp_token;

            // Calculate pool metrics
            const tokenPoolValue = parseFloat(amm.amount.value);
            const xrpPoolValue = Number(amm.amount2) / 1000000; // Convert drops to XRP
            const totalValueLocked = input.token_amount * 2; // Assuming equal values deposited
            const lpTokensReceived = parseFloat(lpTokens.value);

            // Get asset metadata for valuation
            const assetInfo = await agent.getAssetInfo(input.token_id);
            const tokenPriceUSD = assetInfo?.totalValue && assetInfo?.totalSupply ?
                assetInfo.totalValue / assetInfo.totalSupply : 0;

            return {
                status: "success",
                message: `✅ Successfully created AMM for ${currency}/XRP pair`,
                amm_details: {
                    amm_account: amm.account,
                    amm_id: `${currency}/XRP`,
                    token_pool: `${tokenPoolValue} ${currency}`,
                    xrp_pool: `${xrpPoolValue} XRP`,
                    trading_fee: `${input.trading_fee / 100}%`,
                    lp_tokens_received: lpTokensReceived
                },
                transaction_info: {
                    hash: result.result.hash,
                    ledger_index: result.result.ledger_index,
                    fee_burned: `${actualCreationCost} XRP`,
                    validated: result.result.validated
                },
                pool_metrics: {
                    initial_token_deposit: input.token_amount,
                    initial_xrp_deposit: input.xrp_amount,
                    estimated_pool_value_usd: tokenPriceUSD > 0 ?
                        `$${(tokenPriceUSD * input.token_amount * 2).toLocaleString()}` : 'Not available',
                    lp_token_symbol: lpTokens.currency,
                    lp_token_issuer: lpTokens.issuer,
                    your_pool_share: "100%" // As the creator, you own all LP tokens initially
                },
                trading_info: {
                    can_trade: true,
                    supported_pairs: [`${currency} → XRP`, `XRP → ${currency}`],
                    current_rate: `1 ${currency} = ${(xrpPoolValue / tokenPoolValue).toFixed(6)} XRP`,
                    slippage_tolerance: "Automatic based on pool depth"
                },
                next_steps: [
                    "Monitor AMM performance and trading activity",
                    "Consider adding more liquidity to reduce slippage",
                    "Invite other users to provide liquidity",
                    "Use the AMM for token swaps",
                    "Monitor LP token value and yields"
                ],
                warnings: [
                    "⚠️ As a liquidity provider, you're exposed to impermanent loss",
                    "⚠️ Token price volatility affects LP token value",
                    "⚠️ Consider the trading fee vs. volatility balance"
                ]
            };

        } catch (error: any) {
            throw new Error(`Failed to create AMM: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
