import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const DistributeYieldTool: McpTool = {
    name: "rwa_distribute_yield",
    description: "Execute yield distribution payments to RWA token holders",
    schema: {
        asset_id: z.string()
            .describe("Asset ID in format 'CURRENCY.ISSUER'"),
        total_amount: z.number()
            .positive()
            .describe("Total amount to distribute in XRP"),
        holders: z.array(z.string())
            .min(1)
            .describe("Array of token holder addresses"),
        distribution_memo: z.string()
            .optional()
            .describe("Optional memo for the distribution (e.g., 'Q1 2024 Rental Income')")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            const result = await agent.distributeYield(
                input.asset_id,
                input.total_amount,
                input.holders
            );

            const amountPerHolder = input.total_amount / input.holders.length;
            const totalFees = result.transactionHashes.length * 0.000012; // XRPL fee per transaction

            return {
                status: result.status,
                message: result.message,
                distribution_summary: {
                    asset_id: input.asset_id,
                    total_distributed: `${result.totalDistributed} XRP`,
                    successful_payments: result.recipientCount,
                    failed_payments: input.holders.length - result.recipientCount,
                    amount_per_holder: `${amountPerHolder.toFixed(6)} XRP`,
                    total_fees: `${totalFees.toFixed(6)} XRP`
                },
                transaction_details: {
                    successful_hashes: result.transactionHashes,
                    distribution_memo: input.distribution_memo || "Yield distribution payment"
                },
                performance_metrics: {
                    success_rate: `${((result.recipientCount / input.holders.length) * 100).toFixed(1)}%`,
                    total_holders_processed: input.holders.length,
                    processing_status: result.status === 'success' 
                        ? "✅ All payments successful"
                        : result.status === 'partial'
                        ? "⚠️ Some payments failed - review failed transactions"
                        : "❌ Distribution failed"
                },
                next_steps: result.status === 'partial' 
                    ? [
                        "Review failed payment addresses",
                        "Retry failed distributions",
                        "Update holder list if addresses are invalid",
                        "Consider manual distribution for failed payments"
                    ]
                    : [
                        "Notify holders of successful distribution",
                        "Update distribution records",
                        "Schedule next distribution cycle",
                        "Generate distribution report for compliance"
                    ]
            };
        } catch (error: any) {
            throw new Error(`Failed to distribute yield: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
