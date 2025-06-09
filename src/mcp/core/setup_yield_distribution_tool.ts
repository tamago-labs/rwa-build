import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const SetupYieldDistributionTool: McpTool = {
    name: "rwa_setup_yield_distribution",
    description: "Configure automated yield distribution for income-generating RWA tokens",
    schema: {
        asset_id: z.string()
            .describe("Asset ID in format 'CURRENCY.ISSUER'"),
        yield_type: z.enum(['rental', 'interest', 'dividend'])
            .describe("Type of yield being distributed"),
        annual_rate: z.number()
            .min(0)
            .max(50)
            .describe("Annual yield rate as percentage (e.g., 6.5 for 6.5%)"),
        frequency: z.enum(['monthly', 'quarterly'])
            .describe("How often to distribute yield"),
        auto_distribute: z.boolean()
            .default(true)
            .describe("Enable automatic distribution on schedule")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            const distribution = {
                type: input.yield_type,
                frequency: input.frequency,
                rate: input.annual_rate,
                nextPayment: undefined
            };

            const result = await agent.setupYieldDistribution(input.asset_id, distribution);

            // Calculate distribution amounts
            const frequencyMultiplier = input.frequency === 'monthly' ? 12 : 4;
            const distributionRate = input.annual_rate / frequencyMultiplier;

            return {
                status: "success",
                message: `✅ Yield distribution configured for ${input.asset_id}`,
                distribution_config: {
                    asset_id: input.asset_id,
                    yield_type: input.yield_type,
                    annual_rate: `${input.annual_rate}%`,
                    distribution_frequency: input.frequency,
                    rate_per_distribution: `${distributionRate.toFixed(2)}%`,
                    auto_distribute: input.auto_distribute
                },
                schedule_info: {
                    next_payment_date: result.nextPayment,
                    distribution_id: result.distributionId,
                    estimated_yearly_distributions: frequencyMultiplier
                },
                setup_notes: [
                    `${input.yield_type} income will be distributed ${input.frequency}`,
                    `Each distribution: ${distributionRate.toFixed(2)}% of token holdings`,
                    input.auto_distribute 
                        ? "✅ Automatic distribution enabled" 
                        : "⚠️ Manual distribution required",
                    "Ensure sufficient balance in issuer account for distributions"
                ],
                next_steps: [
                    "Fund the distribution account with yield payments",
                    "Test distribution with a small holder group",
                    "Set up monitoring for distribution events",
                    "Configure investor notifications"
                ]
            };
        } catch (error: any) {
            throw new Error(`Failed to setup yield distribution: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
