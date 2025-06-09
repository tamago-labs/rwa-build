import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";

export const GetTransactionHistoryTool: McpTool = {
    name: "rwa_get_transaction_history",
    description: "Get recent transaction history for an account",
    schema: {
        account_address: z.string()
            .regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
            .optional()
            .describe("XRPL address to check (optional, defaults to wallet address)"),
        limit: z.number()
            .int()
            .min(1)
            .max(100)
            .default(20)
            .describe("Number of transactions to retrieve (max 100)")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            const targetAddress = input.account_address || agent.wallet.address;
            const isOwnWallet = targetAddress === agent.wallet.address;

            // Get transaction history
            const transactions = await agent.client.request({
                command: 'account_tx',
                account: targetAddress,
                limit: input.limit || 20,
                ledger_index_min: -1,
                ledger_index_max: -1
            });

            const processedTxs = transactions.result.transactions.map((tx: any) => {
                const transaction = tx.tx;
                const meta = tx.meta;
                const successful = meta.TransactionResult === 'tesSUCCESS';
                
                // Determine transaction type and details
                let txType = transaction.TransactionType;
                let description = '';
                let amount = '';
                let counterparty = '';

                switch (transaction.TransactionType) {
                    case 'Payment':
                        const isOutgoing = transaction.Account === targetAddress;
                        counterparty = isOutgoing ? transaction.Destination : transaction.Account;
                        
                        if (typeof transaction.Amount === 'string') {
                            // XRP payment
                            const xrpAmount = Number(transaction.Amount) / 1000000;
                            amount = `${xrpAmount} XRP`;
                            description = isOutgoing ? `Sent ${amount} to ${counterparty.substring(0, 8)}...` 
                                                    : `Received ${amount} from ${counterparty.substring(0, 8)}...`;
                        } else {
                            // Token payment
                            amount = `${transaction.Amount.value} ${transaction.Amount.currency}`;
                            description = isOutgoing ? `Sent ${amount} to ${counterparty.substring(0, 8)}...`
                                                    : `Received ${amount} from ${counterparty.substring(0, 8)}...`;
                        }
                        break;
                        
                    case 'TrustSet':
                        const currency = transaction.LimitAmount.currency;
                        const issuer = transaction.LimitAmount.issuer;
                        description = `Created trustline for ${currency} (${issuer.substring(0, 8)}...)`;
                        break;
                        
                    case 'OfferCreate':
                        description = `Created trading offer`;
                        break;
                        
                    case 'OfferCancel':
                        description = `Cancelled trading offer`;
                        break;
                        
                    case 'EscrowCreate':
                        description = `Created escrow`;
                        break;
                        
                    case 'EscrowFinish':
                        description = `Released escrow`;
                        break;
                        
                    default:
                        description = `${txType} transaction`;
                }

                return {
                    hash: transaction.hash,
                    type: txType,
                    description: description,
                    amount: amount,
                    counterparty: counterparty || 'N/A',
                    successful: successful,
                    fee: `${Number(transaction.Fee) / 1000000} XRP`,
                    ledger_index: tx.ledger_index,
                    date: new Date((transaction.date + 946684800) * 1000).toISOString(), // Ripple epoch to Unix
                    status: successful ? '✅ Success' : '❌ Failed',
                    result_code: meta.TransactionResult
                };
            });

            // Calculate summary stats
            const successfulTxs = processedTxs.filter(tx => tx.successful);
            const failedTxs = processedTxs.filter(tx => !tx.successful);
            const payments = processedTxs.filter(tx => tx.type === 'Payment');
            const trustlines = processedTxs.filter(tx => tx.type === 'TrustSet');

            return {
                status: "success",
                message: `✅ Retrieved ${processedTxs.length} transactions for ${targetAddress.substring(0, 8)}...`,
                account_info: {
                    address: targetAddress,
                    is_own_wallet: isOwnWallet,
                    network: agent.network
                },
                transaction_summary: {
                    total_transactions: processedTxs.length,
                    successful: successfulTxs.length,
                    failed: failedTxs.length,
                    payments: payments.length,
                    trustlines_created: trustlines.length,
                    success_rate: `${((successfulTxs.length / processedTxs.length) * 100).toFixed(1)}%`
                },
                transactions: processedTxs,
                insights: [
                    `Account has ${processedTxs.length} recent transactions`,
                    `Success rate: ${((successfulTxs.length / processedTxs.length) * 100).toFixed(1)}%`,
                    `Payment transactions: ${payments.length}`,
                    `Trustlines created: ${trustlines.length}`,
                    ...(isOwnWallet ? [
                        failedTxs.length > 0 ? `⚠️ ${failedTxs.length} failed transactions detected` : "✅ All recent transactions successful"
                    ] : [])
                ]
            };
        } catch (error: any) {
            if (error.message.includes('actNotFound')) {
                return {
                    status: "error",
                    message: "❌ Account not found",
                    error_details: {
                        address: input.account_address,
                        issue: "Account does not exist on XRPL or has no transaction history",
                        solution: "Verify address or check if account has been activated"
                    }
                };
            }
            throw new Error(`Failed to get transaction history: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
