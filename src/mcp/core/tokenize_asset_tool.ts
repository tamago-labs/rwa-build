import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const TokenizeAssetTool: McpTool = {
    name: "rwa_tokenize_asset",
    description: "Tokenize a real-world asset on XRPL with basic compliance controls",
    schema: {
        asset_type: z.enum(['real_estate', 'treasury', 'commodity', 'bond'])
            .describe("Type of asset to tokenize"),
        asset_name: z.string()
            .min(1)
            .max(50)
            .describe("Name of the asset (e.g., 'Manhattan Office Building')"),
        total_value: z.number()
            .positive()
            .describe("Total value of the asset in USD"),
        token_symbol: z.string()
            .length(3)
            .regex(/^[A-Z0-9]{3}$/)
            .describe("3-letter token symbol (e.g., 'BLD', 'TBL', 'GLD')"),
        total_supply: z.number()
            .positive()
            .int()
            .describe("Total number of tokens to issue"),
        yield_rate: z.number()
            .min(0)
            .max(50)
            .optional()
            .describe("Annual yield percentage (e.g., 6.5 for 6.5%)"),
        accredited_only: z.boolean()
            .default(false)
            .describe("Restrict to accredited investors only")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();
            
            const result = await agent.tokenizeAsset({
                type: input.asset_type,
                name: input.asset_name,
                totalValue: input.total_value,
                tokenSymbol: input.token_symbol,
                totalSupply: input.total_supply,
                yieldRate: input.yield_rate,
                accreditedOnly: input.accredited_only
            });

            const pricePerToken = input.total_value / input.total_supply;

            return {
                status: result.status,
                message: `✅ Successfully tokenized ${input.asset_name} as ${input.token_symbol}`,
                asset_details: {
                    name: input.asset_name,
                    type: input.asset_type,
                    total_value: `$${input.total_value.toLocaleString()}`,
                    total_supply: `${input.total_supply.toLocaleString()} tokens`,
                    price_per_token: `$${pricePerToken.toFixed(2)}`,
                    yield_rate: input.yield_rate ? `${input.yield_rate}% annually` : 'No yield configured'
                },
                token_info: {
                    token_id: result.tokenId,
                    currency_code: result.currency,
                    issuer_address: result.issuerAddress
                },
                next_steps: [
                    "Set up yield distribution (if income-generating asset)",
                    "Create trustlines for investors", 
                    "Configure secondary market trading",
                    "Begin investor onboarding"
                ],
                compliance: {
                    accredited_only: input.accredited_only,
                    jurisdiction: "US (default for MVP)",
                    regulatory_notes: input.accredited_only 
                        ? "⚖️ Restricted to accredited investors under Regulation D"
                        : "⚖️ Consider SEC registration requirements for public offerings"
                }
            };
        } catch (error: any) {
            throw new Error(`Failed to tokenize asset: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
