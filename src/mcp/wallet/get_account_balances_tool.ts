import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const GetAccountBalancesTool: McpTool = {
    name: "rwa_get_account_balances",
    description: "Get all token balances and trustlines for an account",
    schema: {
        account_address: z.string()
            .regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
            .optional()
            .describe("XRPL address to check (optional, defaults to wallet address)")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            const targetAddress = input.account_address || agent.wallet.address;
            const isOwnWallet = targetAddress === agent.wallet.address;

            // Get account info for XRP balance
            const accountInfo = await agent.client.request({
                command: 'account_info',
                account: targetAddress,
                ledger_index: 'validated'
            });

            const xrpBalance = Number(accountInfo.result.account_data.Balance) / 1000000;

            // Get trustlines (token balances)
            const trustLines = await agent.client.request({
                command: 'account_lines',
                account: targetAddress,
                ledger_index: 'validated'
            });

            const tokenBalances = trustLines.result.lines.map((line: any) => ({
                currency: line.currency,
                issuer: line.account,
                balance: Math.abs(Number(line.balance)), // Absolute value for holders
                limit: line.limit,
                quality_in: line.quality_in,
                quality_out: line.quality_out,
                is_frozen: line.freeze || false,
                asset_id: `${line.currency}.${line.account}`
            }));

            const totalTokenTypes = tokenBalances.length;
            const activeBalances = tokenBalances.filter(token => token.balance > 0);

            return {
                status: "success",
                message: `✅ Account balances retrieved for ${targetAddress.substring(0, 8)}...`,
                account_info: {
                    address: targetAddress,
                    network: agent.network,
                    is_own_wallet: isOwnWallet
                },
                xrp_balance: {
                    amount: `${xrpBalance.toFixed(6)} XRP`,
                    drops: accountInfo.result.account_data.Balance,
                    available_for_fees: xrpBalance > 10,
                    reserve_status: xrpBalance >= 10 ? "✅ Above reserve" : "⚠️ Below reserve (10 XRP)"
                },
                token_balances: tokenBalances.length > 0 ? tokenBalances : [],
                portfolio_summary: {
                    total_trustlines: totalTokenTypes,
                    active_balances: activeBalances.length,
                    xrp_balance: xrpBalance,
                    portfolio_status: activeBalances.length > 0 
                        ? `${activeBalances.length} active token positions`
                        : "No token holdings"
                },
                insights: [
                    `XRP Balance: ${xrpBalance.toFixed(6)} XRP`,
                    `Token Types: ${totalTokenTypes}`,
                    `Active Positions: ${activeBalances.length}`,
                    ...(isOwnWallet ? [
                        xrpBalance < 1 ? "⚠️ Low XRP - may need funding for transactions" : "✅ Sufficient XRP for operations",
                        totalTokenTypes === 0 ? "💡 Create trustlines to hold RWA tokens" : `📊 Tracking ${totalTokenTypes} different tokens`
                    ] : [
                        "📋 External account analysis complete"
                    ])
                ]
            };
        } catch (error: any) {
            if (error.message.includes('actNotFound')) {
                return {
                    status: "error",
                    message: "❌ Account not found",
                    error_details: {
                        address: input.account_address,
                        issue: "Account does not exist on XRPL",
                        solution: "Check address format or fund account with minimum 10 XRP"
                    }
                };
            }
            throw new Error(`Failed to get account balances: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
