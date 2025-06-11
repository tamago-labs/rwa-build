import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";
import { Payment, xrpToDrops } from 'xrpl';
import { dropsToXrp } from "../../utils/xrpl_helpers";

export const SwapAMMTool: McpTool = {
    name: "rwa_swap_amm",
    description: "Swap tokens using XRPL AMM (Automated Market Maker) - supports RWA token ↔ XRP swaps",
    schema: {
        from_asset: z.union([
            z.literal("XRP"),
            z.string().regex(/^[A-Z0-9]{3}\.r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
        ]).describe("Asset to swap from: 'XRP' or token in format 'CURRENCY.ISSUER'"),
        to_asset: z.union([
            z.literal("XRP"),
            z.string().regex(/^[A-Z0-9]{3}\.r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
        ]).describe("Asset to swap to: 'XRP' or token in format 'CURRENCY.ISSUER'"),
        amount: z.number()
            .positive()
            .describe("Amount of the 'from_asset' to swap"),
        max_slippage_percent: z.number()
            .min(0.1)
            .max(50)
            .default(2.0)
            .describe("Maximum acceptable slippage percentage (default: 2%)"),
        memo: z.string()
            .max(1000)
            .optional()
            .describe("Optional memo for the swap transaction")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            // Validate that we're not trying to swap the same asset
            if (input.from_asset === input.to_asset) {
                throw new Error("Cannot swap an asset to itself");
            }

            // Parse asset information
            let fromCurrency: string | null, fromIssuer: string | undefined;
            let toCurrency: string | null, toIssuer: string | undefined;

            if (input.from_asset === "XRP") {
                fromCurrency = null; // XRP has no currency code
                fromIssuer = undefined;
            } else {
                [fromCurrency, fromIssuer] = input.from_asset.split('.');
            }

            if (input.to_asset === "XRP") {
                toCurrency = null; // XRP has no currency code
                toIssuer = undefined;
            } else {
                [toCurrency, toIssuer] = input.to_asset.split('.');
            }

            // Check user's balance for the from_asset
            const balances = await agent.getRWATokenBalances();
            let fromBalance = 0;

            if (input.from_asset === "XRP") {
                fromBalance = balances.xrp_balance;
                const availableXRP = fromBalance - 11; // Keep 11 XRP reserved
                if (availableXRP < input.amount) {
                    throw new Error(
                        `Insufficient XRP balance. Available for swap: ${availableXRP} XRP, Requested: ${input.amount} XRP`
                    );
                }
            } else {
                const tokenBalance = balances.rwa_tokens.find(
                    token => token.currency === fromCurrency && token.issuer === fromIssuer
                );
                fromBalance = tokenBalance?.balance || 0;

                if (fromBalance < input.amount) {
                    throw new Error(
                        `Insufficient ${fromCurrency} balance. Available: ${fromBalance}, Requested: ${input.amount}`
                    );
                }
            }

            // Check if AMM exists for this pair
            let ammInfo;
            try {
                const ammAsset1: any = input.from_asset === "XRP" ?
                    { currency: "XRP" } :
                    { currency: fromCurrency, issuer: fromIssuer };
                const ammAsset2: any = input.to_asset === "XRP" ?
                    { currency: "XRP" } :
                    { currency: toCurrency, issuer: toIssuer };

                ammInfo = await agent.client.request({
                    command: 'amm_info',
                    asset: ammAsset1,
                    asset2: ammAsset2,
                    ledger_index: "validated"
                });
            } catch (error: any) {
                console.warn("AMM not found, will try order book routing");
            }

            console.error("AMM exists about to swap...", ammInfo)

            // Estimate output amount with slippage protection
            const slippageMultiplier = (100 - input.max_slippage_percent) / 100;
            let estimatedOutput = input.amount; // Simple 1:1 estimate, will be refined by path_find

            if (ammInfo?.result?.amm) {
                const amm: any = ammInfo.result.amm;
                const tradingFeeRate = amm.trading_fee / 100000;

                if (input.from_asset === "XRP") { 
                    const xrpPool = Number(amm.amount) / 1000000;
                    const tokenPool = parseFloat(amm.amount2.value);
                    const inputAfterFee = input.amount * (1 - tradingFeeRate);
                    estimatedOutput = (inputAfterFee * tokenPool) / (xrpPool + inputAfterFee);
                } else { 
                    const tokenPool = parseFloat(amm.amount.value);
                    const xrpPool = Number(amm.amount2) / 1000000;
                    const inputAfterFee = input.amount * (1 - tradingFeeRate);
                    estimatedOutput = (inputAfterFee * xrpPool) / (tokenPool + inputAfterFee);
                }
            }

            const minimumOutput = estimatedOutput * slippageMultiplier;
  
            // Use path_find to discover optimal routing (following your example)
            let pathFindResult: any;

            try {
                let pathFindRequest: any = {
                    command: 'path_find',
                    subcommand: 'create',
                    source_account: agent.wallet.address,
                    destination_account: agent.wallet.address
                };

                // Set source and destination amounts based on swap direction
                if (input.from_asset === "XRP") {
                    // XRP -> Token
                    pathFindRequest.source_amount = xrpToDrops(input.amount);
                    pathFindRequest.destination_amount = {
                        currency: toCurrency,
                        value: minimumOutput.toString(),
                        issuer: toIssuer
                    };
                } else if (input.to_asset === "XRP") {
                    // Token -> XRP
                    pathFindRequest.source_amount = {
                        currency: fromCurrency,
                        value: input.amount.toString(),
                        issuer: fromIssuer
                    };
                    pathFindRequest.destination_amount = xrpToDrops(minimumOutput);
                } else {
                    // Token -> Token
                    pathFindRequest.source_amount = {
                        currency: fromCurrency,
                        value: input.amount.toString(),
                        issuer: fromIssuer
                    };
                    pathFindRequest.destination_amount = {
                        currency: toCurrency,
                        value: minimumOutput.toString(),
                        issuer: toIssuer
                    };
                }

                pathFindResult = await agent.client.request(pathFindRequest);
            } catch (error: any) {
                console.warn("Path finding failed:", error.message);
            }
 

            // Create swap transaction (following your example structure)
            let swapTxData: any;

            if (input.from_asset === "XRP") {
                // XRP -> Token
                swapTxData = {
                    TransactionType: "Payment",
                    Account: agent.wallet.address,
                    Destination: agent.wallet.address,
                    Amount: {
                        currency: toCurrency!,
                        value: minimumOutput.toString(),
                        issuer: toIssuer!
                    },
                    SendMax: xrpToDrops(input.amount),
                    Paths: [[
                        {
                            currency: toCurrency!,
                            issuer: toIssuer!,
                            type: 48
                        }
                    ]],
                    Fee: '12'
                };
            } else if (input.to_asset === "XRP") {
                // Token -> XRP
                swapTxData = {
                    TransactionType: "Payment",
                    Account: agent.wallet.address,
                    Destination: agent.wallet.address,
                    Amount: xrpToDrops(minimumOutput),
                    SendMax: {
                        currency: fromCurrency!,
                        value: input.amount.toString(),
                        issuer: fromIssuer!
                    },
                    Paths: [[
                        {
                            currency: "XRP",
                            type: 16
                        }
                    ]],
                    Fee: '12'
                };
            } else {
                // Token -> Token
                swapTxData = {
                    TransactionType: "Payment",
                    Account: agent.wallet.address,
                    Destination: agent.wallet.address,
                    Amount: {
                        currency: toCurrency!,
                        value: minimumOutput.toString(),
                        issuer: toIssuer!
                    },
                    SendMax: {
                        currency: fromCurrency!,
                        value: input.amount.toString(),
                        issuer: fromIssuer!
                    },
                    Paths: [[
                        {
                            account: fromIssuer!,
                            type: 1
                        },
                        {
                            currency: toCurrency!,
                            issuer: toIssuer!,
                            type: 48
                        }
                    ]],
                    Fee: '12'
                };
            }
 

            // Use paths from path_find if available
            if (pathFindResult?.result?.alternatives?.length > 0) {
                const bestAlternative = pathFindResult.result.alternatives[0];
                if (bestAlternative.paths_computed && bestAlternative.paths_computed.length > 0) {
                    swapTxData.Paths = bestAlternative.paths_computed;
                }
            }

            // Add memo if provided
            if (input.memo) {
                swapTxData.Memos = [{
                    Memo: {
                        MemoType: Buffer.from('amm_swap', 'utf8').toString('hex').toUpperCase(),
                        MemoData: Buffer.from(input.memo, 'utf8').toString('hex').toUpperCase()
                    }
                }];
            }

            // Submit the transaction
            const payPrepared = await agent.client.autofill(swapTxData);
            const paySigned = agent.wallet.sign(payPrepared);
            const payResult: any = await agent.client.submitAndWait(paySigned.tx_blob);

            if (payResult.result.meta.TransactionResult !== "tesSUCCESS") {
                throw new Error(`Swap failed: ${payResult.result.meta.TransactionResult}`);
            }
 

            // Extract actual delivered amount
            const deliveredAmount = payResult.result.meta?.delivered_amount;
            let actualOutputAmount: number;
            let actualOutputDisplay: string;

            if (input.to_asset === "XRP") {
                actualOutputAmount = typeof deliveredAmount === 'string' ?
                    parseFloat(`${dropsToXrp(deliveredAmount)}`) : 0;
                actualOutputDisplay = `${actualOutputAmount} XRP`;
            } else {
                actualOutputAmount = typeof deliveredAmount === 'object' && deliveredAmount?.value ?
                    parseFloat(deliveredAmount.value) : 0;
                actualOutputDisplay = `${actualOutputAmount} ${toCurrency}`;
            }

            // Calculate metrics
            const actualRate = actualOutputAmount / input.amount;
            const expectedRate = estimatedOutput / input.amount;
            const actualSlippage = expectedRate > 0 ?
                Math.abs((expectedRate - actualRate) / expectedRate) * 100 : 0;

            // Get updated balances
            const updatedBalances = await agent.client.request({
                command: "account_lines",
                account: agent.wallet.address,
                ledger_index: "validated"
            });
 
            return {
                status: "success",
                message: `✅ Successfully swapped ${input.amount} ${input.from_asset === "XRP" ? "XRP" : fromCurrency} for ${actualOutputDisplay}`,
                swap_details: {
                    from_asset: input.from_asset,
                    to_asset: input.to_asset,
                    input_amount: input.amount,
                    output_amount: actualOutputAmount,
                    output_display: actualOutputDisplay,
                    swap_rate: `1 ${input.from_asset === "XRP" ? "XRP" : fromCurrency} = ${actualRate.toFixed(6)} ${input.to_asset === "XRP" ? "XRP" : toCurrency}`
                },
                transaction_info: {
                    hash: paySigned.hash,
                    ledger_index: payResult.result.ledger_index,
                    fee_paid: `${Number(swapTxData.Fee) / 1000000} XRP`,
                    validated: payResult.result.validated,
                    transaction_result: payResult.result.meta.TransactionResult
                },
                execution_metrics: {
                    expected_output: estimatedOutput.toFixed(6),
                    minimum_expected: minimumOutput.toFixed(6),
                    actual_output: actualOutputAmount.toFixed(6),
                    slippage_experienced: `${actualSlippage.toFixed(3)}%`,
                    slippage_tolerance: `${input.max_slippage_percent}%`,
                    slippage_status: actualSlippage <= input.max_slippage_percent ?
                        "✅ Within tolerance" : "⚠️ Exceeded tolerance"
                },
                routing_info: {
                    path_finding_used: !!pathFindResult?.result?.alternatives?.length,
                    paths_computed: pathFindResult?.result?.alternatives?.length || 0,
                    amm_available: !!ammInfo?.result?.amm,
                    execution_method: "Payment with Paths"
                },
                updated_balances: {
                    account_lines: updatedBalances.result.lines,
                    balance_count: updatedBalances.result.lines.length
                },
                next_steps: [
                    "Check your updated token balances",
                    "Monitor price movements for future trades",
                    "Consider providing liquidity if spreads are wide"
                ]
            };

        } catch (error: any) {
            throw new Error(`Failed to swap on AMM: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
