import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const SendXRPTool: McpTool = {
    name: "rwa_send_xrp",
    description: "Send XRP to another XRPL address",
    schema: {
        destination: z.string()
            .regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
            .describe("Recipient's XRPL address"),
        amount: z.number()
            .positive()
            .describe("Amount of XRP to send"),
        memo: z.string()
            .optional()
            .describe("Optional memo for the transaction"),
        destination_tag: z.number()
            .int()
            .min(0)
            .max(4294967295)
            .optional()
            .describe("Optional destination tag")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            // Check sender balance first
            const walletInfo = await agent.getWalletInfo();
            const currentBalance = Number(walletInfo.account_data.Balance) / 1000000;
            const requiredAmount = input.amount + 0.000012; // Amount + fee

            if (currentBalance < requiredAmount) {
                return {
                    status: "error",
                    message: "❌ Insufficient XRP balance",
                    error_details: {
                        current_balance: `${currentBalance.toFixed(6)} XRP`,
                        required_amount: `${requiredAmount.toFixed(6)} XRP`,
                        shortfall: `${(requiredAmount - currentBalance).toFixed(6)} XRP`,
                        note: "Amount includes 0.000012 XRP transaction fee"
                    }
                };
            }

            // Prepare payment transaction
            const payment: any = {
                TransactionType: 'Payment',
                Account: agent.wallet.address,
                Destination: input.destination,
                Amount: (input.amount * 1000000).toString(), // Convert to drops
                Fee: '12' // Standard fee in drops
            };

            // Add optional fields
            if (input.destination_tag !== undefined) {
                payment.DestinationTag = input.destination_tag;
            }

            if (input.memo) {
                payment.Memos = [{
                    Memo: {
                        MemoData: Buffer.from(input.memo, 'utf8').toString('hex')
                    }
                }];
            }

            // Submit transaction
            const result = await agent.client.submitAndWait(payment, { wallet: agent.wallet });

            // Get new balance
            const newWalletInfo = await agent.getWalletInfo();
            const newBalance = Number(newWalletInfo.account_data.Balance) / 1000000;

            return {
                status: "success",
                message: `✅ Successfully sent ${input.amount} XRP to ${input.destination.substring(0, 8)}...`,
                transaction_details: {
                    transaction_hash: result.result.hash,
                    ledger_index: result.result.ledger_index,
                    fee_paid: "0.000012 XRP",
                    from_address: agent.wallet.address,
                    to_address: input.destination,
                    amount_sent: `${input.amount} XRP`,
                    memo: input.memo || "None",
                    destination_tag: input.destination_tag || "None"
                },
                balance_changes: {
                    previous_balance: `${currentBalance.toFixed(6)} XRP`,
                    new_balance: `${newBalance.toFixed(6)} XRP`,
                    total_deducted: `${(currentBalance - newBalance).toFixed(6)} XRP`
                },
                network_info: {
                    network: agent.network,
                    confirmed: result.result.meta?.TransactionResult === 'tesSUCCESS',
                    validation_time: "3-5 seconds (XRPL average)"
                }
            };
        } catch (error: any) {
            if (error.message.includes('tecUNFUNDED_PAYMENT')) {
                return {
                    status: "error",
                    message: "❌ Payment failed - insufficient funds",
                    error_details: {
                        issue: "Account does not have enough XRP for payment + fees",
                        suggestion: "Check balance and reduce payment amount"
                    }
                };
            }
            
            if (error.message.includes('tecNO_DST')) {
                return {
                    status: "error",
                    message: "❌ Payment failed - destination account not found",
                    error_details: {
                        issue: "Destination account does not exist",
                        suggestion: "Verify recipient address or ensure account is activated"
                    }
                };
            }

            throw new Error(`Failed to send XRP: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
