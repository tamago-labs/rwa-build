import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const GetAssetInfoTool: McpTool = {
    name: "rwa_get_asset_info",
    description: "Retrieve detailed information about a tokenized RWA asset",
    schema: {
        asset_id: z.string()
            .describe("Asset ID in format 'CURRENCY.ISSUER'")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            // Get basic asset info
            const assetInfo = await agent.getAssetInfo(input.asset_id);
            
            if (!assetInfo) {
                return {
                    status: "error",
                    message: `Asset ${input.asset_id} not found`,
                    suggestion: "Verify the asset ID format (CURRENCY.ISSUER) and ensure the asset has been tokenized"
                };
            }

            // Get issuer account info
            const walletInfo = await agent.getWalletInfo();
            
            const [currency, issuer] = input.asset_id.split('.');

            return {
                status: "success",
                message: `✅ Asset information retrieved for ${input.asset_id}`,
                asset_details: {
                    asset_id: input.asset_id,
                    asset_name: assetInfo.name,
                    asset_type: assetInfo.type,
                    token_symbol: assetInfo.tokenSymbol,
                    total_value: assetInfo.totalValue ? `$${assetInfo.totalValue.toLocaleString()}` : "Not set",
                    total_supply: assetInfo.totalSupply ? `${assetInfo.totalSupply.toLocaleString()} tokens` : "Not set",
                    yield_rate: assetInfo.yieldRate ? `${assetInfo.yieldRate}% annually` : "No yield configured"
                },
                token_technical_info: {
                    currency_code: currency,
                    issuer_address: issuer,
                    issuer_balance: `${Number(walletInfo.account_data.Balance) / 1000000} XRP`,
                    account_sequence: walletInfo.account_data.Sequence,
                    network: agent.network
                },
                trading_info: {
                    tradeable: "Ready for trustline creation",
                    exchange_support: "Compatible with XRPL DEX and AMM",
                    minimum_trade: "Configurable per implementation"
                },
                compliance_status: {
                    issuer_flags: "Standard XRPL issuer account",
                    transfer_restrictions: "Configurable via trustline flags",
                    regulatory_framework: "Depends on asset type and jurisdiction"
                },
                useful_operations: [
                    "Create trustlines for new investors",
                    "Set up yield distribution if income-generating",
                    "Configure trading pairs on DEX",
                    "Monitor token holder balances"
                ]
            };
        } catch (error: any) {
            throw new Error(`Failed to get asset info: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
