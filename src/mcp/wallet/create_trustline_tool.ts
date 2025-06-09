import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const CreateTrustlineTool: McpTool = {
    name: "rwa_create_trustline",
    description: "Create a trustline to hold RWA tokens from an issuer",
    schema: {
        currency: z.string()
            .length(3)
            .regex(/^[A-Z0-9]{3}$/)
            .describe("3-letter currency code (e.g., 'BLD', 'TBL', 'GLD')"),
        issuer: z.string()
            .regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
            .describe("Issuer's XRPL address"),
        limit: z.number()
            .positive()
            .optional()
            .describe("Maximum amount willing to hold (optional, defaults to 1000000000)")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            // Check if trustline already exists
            const existingLines = await agent.client.request({
                command: 'account_lines',
                account: agent.wallet.address,
                ledger_index: 'validated'
            });

            const existingTrustline = existingLines.result.lines.find((line: any) => 
                line.currency === input.currency && line.account === input.issuer
            );

            if (existingTrustline) {
                return {
                    status: "info",
                    message: `ℹ️ Trustline already exists for ${input.currency}.${input.issuer.substring(0, 8)}...`,
                    existing_trustline: {
                        currency: existingTrustline.currency,
                        issuer: existingTrustline.account,
                        current_balance: Math.abs(Number(existingTrustline.balance)),
                        limit: existingTrustline.limit,
                        asset_id: `${existingTrustline.currency}.${existingTrustline.account}`,
                        status: "Active"
                    },
                    recommendation: "Trustline is ready to receive tokens"
                };
            }

            // Create new trustline
            const trustSet: any = {
                TransactionType: 'TrustSet',
                Account: agent.wallet.address,
                LimitAmount: {
                    currency: input.currency,
                    issuer: input.issuer,
                    value: (input.limit || 1000000000).toString()
                },
                Fee: '12'
            };

            const result = await agent.client.submitAndWait(trustSet, { wallet: agent.wallet });

            return {
                status: "success",
                message: `✅ Trustline created for ${input.currency} tokens`,
                trustline_details: {
                    currency: input.currency,
                    issuer: input.issuer,
                    limit: input.limit || 1000000000,
                    asset_id: `${input.currency}.${input.issuer}`,
                    current_balance: 0,
                    ready_to_receive: true
                },
                transaction_info: {
                    transaction_hash: result.result.hash,
                    ledger_index: result.result.ledger_index,
                    fee_paid: "0.000012 XRP",
                    network: agent.network
                },
                next_steps: [
                    `Ready to receive ${input.currency} tokens from issuer`,
                    "Tokens can now be sent to your address",
                    "Monitor balance with rwa_get_account_balances",
                    "Participate in yield distributions if applicable"
                ],
                investment_info: {
                    note: `This trustline allows you to hold up to ${(input.limit || 1000000000).toLocaleString()} ${input.currency} tokens`,
                    issuer_info: `Tokens issued by: ${input.issuer}`,
                    risk_notice: "Only create trustlines for assets you trust and understand"
                }
            };
        } catch (error: any) {
            if (error.message.includes('tecNO_AUTH')) {
                return {
                    status: "error",
                    message: "❌ Trustline creation failed - authorization required",
                    error_details: {
                        issue: "Issuer requires authorization for trustlines",
                        currency: input.currency,
                        issuer: input.issuer,
                        solution: "Contact the asset issuer for authorization"
                    }
                };
            }

            if (error.message.includes('tecNO_LINE_INSUF_RESERVE')) {
                return {
                    status: "error",
                    message: "❌ Insufficient XRP reserve for trustline",
                    error_details: {
                        issue: "Each trustline requires 2 XRP reserve",
                        solution: "Add more XRP to your wallet (minimum 2 XRP per trustline)",
                        current_currency: input.currency
                    }
                };
            }

            throw new Error(`Failed to create trustline: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
