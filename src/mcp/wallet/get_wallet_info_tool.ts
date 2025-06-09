import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const GetWalletInfoTool: McpTool = {
    name: "rwa_get_wallet_info",
    description: "Get wallet address and basic account information",
    schema: {},
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            const walletInfo = await agent.getWalletInfo();
            const balanceInXRP = Number(walletInfo.account_data.Balance) / 1000000;

            return {
                status: "success",
                message: "✅ Wallet information retrieved successfully",
                wallet_details: {
                    address: agent.wallet.address,
                    network: agent.network,
                    balance: `${balanceInXRP.toFixed(6)} XRP`,
                    balance_in_drops: walletInfo.account_data.Balance,
                    sequence: walletInfo.account_data.Sequence,
                    account_flags: walletInfo.account_data.Flags || 0
                },
                account_status: {
                    activated: true,
                    reserve_requirement: "10 XRP minimum",
                    can_tokenize: balanceInXRP >= 10,
                    ready_for_operations: balanceInXRP >= 1
                },
                recommendations: balanceInXRP < 10 
                    ? [
                        "⚠️ Low XRP balance detected",
                        "Fund wallet with at least 10 XRP for tokenization",
                        "Reserve requirement: 10 XRP for account operations",
                        `Current balance: ${balanceInXRP.toFixed(6)} XRP`
                    ]
                    : [
                        "✅ Wallet has sufficient balance for operations",
                        "Ready to tokenize assets",
                        "Ready to create trustlines and distribute yields"
                    ]
            };
        } catch (error: any) {
            throw new Error(`Failed to get wallet info: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
