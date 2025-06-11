import { z } from "zod";
import { RWAAgent } from "../../agent";
import { type McpTool } from "../../types";
import { Payment } from 'xrpl';

export const SendRWATokenTool: McpTool = {
    name: "rwa_send_rwa_token",
    description: "Send RWA tokens to another XRPL address using token format like PAT.rHJZf5qYxwH2Fnms1Uwmi61VfHqoTALgXw",
    schema: {
        token_id: z.string()
            .regex(/^[A-Z0-9]{3}\.r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
            .describe("Token ID in format 'CURRENCY.ISSUER' (e.g., 'PAT.rHJZf5qYxwH2Fnms1Uwmi61VfHqoTALgXw')"),
        destination: z.string()
            .regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/)
            .describe("Recipient's XRPL address"),
        amount: z.number()
            .positive()
            .describe("Amount of RWA tokens to send"),
        destination_tag: z.number()
            .int()
            .min(0)
            .max(4294967295)
            .optional()
            .describe("Optional destination tag"),
        memo: z.string()
            .max(1000)
            .optional()
            .describe("Optional memo for the transaction")
    },
    handler: async (agent: RWAAgent, input: Record<string, any>) => {
        try {
            await agent.connect();

            // Parse token ID to extract currency and issuer
            const [currency, issuer] = input.token_id.split('.');

            // Validate that the token exists and get metadata
            const assetInfo = await agent.getAssetInfo(input.token_id);
            if (!assetInfo) {
                throw new Error(`Token ${input.token_id} not found or invalid`);
            }

            // Check sender's balance for the token
            const balances = await agent.getRWATokenBalances();
            const tokenBalance = balances.rwa_tokens.find(
                token => token.currency === currency && token.issuer === issuer
            );

            if (!tokenBalance || tokenBalance.balance < input.amount) {
                throw new Error(
                    `Insufficient balance. Available: ${tokenBalance?.balance || 0} ${currency}, Requested: ${input.amount}`
                );
            }

            // Validate destination address
            try {
                const destInfo = await agent.client.request({
                    command: 'account_info',
                    account: input.destination,
                    ledger_index: 'validated'
                });
                
                if (!destInfo.result.account_data) {
                    throw new Error(`Destination address ${input.destination} does not exist`);
                }
            } catch (error: any) {
                if (error.message.includes('actNotFound')) {
                    throw new Error(`Destination address ${input.destination} does not exist or is not activated`);
                }
                throw error;
            }

            // Check if destination has a trustline for this token
            let hasTrustline = false;
            try {
                const destLines = await agent.client.request({
                    command: 'account_lines',
                    account: input.destination,
                    ledger_index: 'validated'
                });

                hasTrustline = destLines.result.lines.some(
                    line => line.currency === currency && line.account === issuer
                );
            } catch (error) {
                console.error('Could not check destination trustlines:', error);
            }

            // Prepare the payment transaction
            const payment: Payment = {
                TransactionType: 'Payment',
                Account: agent.wallet.address,
                Destination: input.destination,
                Amount: {
                    currency: currency,
                    issuer: issuer,
                    value: input.amount.toString()
                },
                Fee: '12'
            };

            // Add destination tag if provided
            if (input.destination_tag !== undefined) {
                payment.DestinationTag = input.destination_tag;
            }

            // Add memo if provided
            if (input.memo) {
                payment.Memos = [{
                    Memo: {
                        MemoType: Buffer.from('rwa_transfer', 'utf8').toString('hex').toUpperCase(),
                        MemoData: Buffer.from(input.memo, 'utf8').toString('hex').toUpperCase()
                    }
                }];
            }

            // Submit the payment transaction
            const result = await agent.client.submitAndWait(payment, { wallet: agent.wallet });

            // Calculate transaction cost and token value
            const fee = Number(payment.Fee) / 1000000; // Convert drops to XRP
            const tokenValue = assetInfo.totalValue ? 
                (input.amount * (assetInfo.totalValue / assetInfo.totalSupply)) : 0;

            // Get updated balances
            const updatedBalances = await agent.getRWATokenBalances();
            const updatedTokenBalance = updatedBalances.rwa_tokens.find(
                token => token.currency === currency && token.issuer === issuer
            );

            return {
                status: "success",
                message: `✅ Successfully sent ${input.amount} ${currency} tokens to ${input.destination}`,
                transaction_details: {
                    hash: result.result.hash,
                    ledger_index: result.result.ledger_index,
                    fee_paid: `${fee} XRP`,
                    validated: result.result.validated
                },
                transfer_summary: {
                    token_id: input.token_id,
                    currency: currency,
                    issuer: issuer,
                    amount_sent: input.amount,
                    estimated_value: tokenValue > 0 ? `$${tokenValue.toLocaleString()}` : 'Not available',
                    sender: agent.wallet.address,
                    recipient: input.destination,
                    destination_tag: input.destination_tag,
                    memo: input.memo
                },
                balance_update: {
                    previous_balance: tokenBalance.balance,
                    new_balance: updatedTokenBalance?.balance || 0,
                    remaining_tokens: updatedTokenBalance?.balance || 0
                },
                asset_info: {
                    asset_name: assetInfo.name,
                    asset_type: assetInfo.type,
                    price_per_token: assetInfo.totalValue && assetInfo.totalSupply ? 
                        `$${(assetInfo.totalValue / assetInfo.totalSupply).toFixed(2)}` : 'Not available'
                },
                warnings: [
                    ...(hasTrustline ? [] : ["⚠️ Recipient may not have a trustline for this token"]),
                    ...(tokenValue === 0 ? ["⚠️ Token valuation data not available"] : [])
                ],
                next_steps: [
                    "Verify recipient received the tokens",
                    "Check transaction status on XRPL explorer",
                    ...(hasTrustline ? [] : ["Ensure recipient creates trustline for this token"])
                ]
            };

        } catch (error: any) {
            throw new Error(`Failed to send RWA token: ${error.message}`);
        } finally {
            await agent.disconnect();
        }
    }
};
