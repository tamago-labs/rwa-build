import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const ValidateAddressTool: McpTool = {
    name: "rwa_validate_address",
    description: "Validate XRPL address format and check if account exists",
    schema: {
        address: z.string()
            .describe("XRPL address to validate")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            const address = input.address.trim();
            
            // Format validation
            const xrplAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/;
            const isValidFormat = xrplAddressRegex.test(address);
            
            if (!isValidFormat) {
                return {
                    status: "invalid",
                    message: "❌ Invalid XRPL address format",
                    validation_results: {
                        address: address,
                        format_valid: false,
                        exists_on_ledger: false,
                        issues: [
                            "XRPL addresses must start with 'r'",
                            "Must be 25-34 characters long",
                            "Can only contain base58 characters (no 0, O, I, l)"
                        ],
                        examples: [
                            "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
                            "rPT1Sjq2YGrBMTttX4GZHjKu9dyfQeEBUs"
                        ]
                    }
                };
            }

            await agent.connect();

            // Check if account exists on ledger
            let accountExists = false;
            let accountInfo: any = null;
            let errorReason = '';

            try {
                const response = await agent.client.request({
                    command: 'account_info',
                    account: address,
                    ledger_index: 'validated'
                });
                accountExists = true;
                accountInfo = response.result.account_data;
            } catch (error: any) {
                if (error.message.includes('actNotFound')) {
                    accountExists = false;
                    errorReason = 'Account not activated on XRPL';
                } else {
                    throw error;
                }
            }

            // Additional checks if account exists
            let accountDetails: any = {};
            if (accountExists && accountInfo) {
                const balance = Number(accountInfo.Balance) / 1000000;
                accountDetails = {
                    balance: `${balance.toFixed(6)} XRP`,
                    sequence: accountInfo.Sequence,
                    flags: accountInfo.Flags || 0,
                    activated: true,
                    reserve_met: balance >= 10,
                    can_receive_payments: true
                };
            }

            return {
                status: accountExists ? "valid" : "format_valid",
                message: accountExists 
                    ? `✅ Valid XRPL address with active account`
                    : `⚠️ Valid format but account not found on ledger`,
                validation_results: {
                    address: address,
                    format_valid: true,
                    exists_on_ledger: accountExists,
                    network: agent.network,
                    ...(accountExists ? {
                        account_details: accountDetails
                    } : {
                        activation_required: true,
                        reason: errorReason,
                        note: "Account needs to receive minimum 10 XRP to activate"
                    })
                },
                recommendations: accountExists ? [
                    "✅ Address is valid and active",
                    "Safe to send payments to this address",
                    "Account can receive both XRP and tokens"
                ] : [
                    "⚠️ Account not yet activated on XRPL",
                    "Send minimum 10 XRP to activate this address",
                    "Address format is correct"
                ]
            };
        } catch (error: any) {
            throw new Error(`Failed to validate address: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
