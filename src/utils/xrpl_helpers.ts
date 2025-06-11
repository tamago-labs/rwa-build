import { convertStringToHex, convertHexToString } from 'xrpl';
import { Wallet } from "xrpl"

export function generateCurrencyCode(tokenSymbol: string): string {
    // Ensure 3 characters, uppercase
    return tokenSymbol.toUpperCase().padEnd(3, '0').substring(0, 3);
}

export function formatCurrencyCode(currency: string): string {
    // Remove trailing zeros and format for display
    return currency.replace(/0+$/, '');
}

export function createMemo(text: string): any {
    return {
        Memo: {
            MemoData: convertStringToHex(text)
        }
    };
}

export function parseMemo(memoData: string): string {
    try {
        return convertHexToString(memoData);
    } catch (error) {
        return memoData; // Return as-is if conversion fails
    }
}

export function generateAssetId(currencyCode: string, issuerAddress: string): string {
    return `${currencyCode}.${issuerAddress}`;
}

export function parseAssetId(assetId: string): { currency: string; issuer: string } | null {
    const parts = assetId.split('.');
    if (parts.length !== 2) {
        return null;
    }
    return {
        currency: parts[0],
        issuer: parts[1]
    };
}

export function isValidXRPLAddress(address: string): boolean {
    const xrplAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/;
    return xrplAddressRegex.test(address);
}

export function dropsToXrp(drops: string | number): number {
    return Number(drops) / 1000000;
}

export function xrpToDrops(xrp: string | number): string {
    return (Number(xrp) * 1000000).toString();
}

export function formatTransactionResult(result: any): {
    hash: string;
    ledgerIndex: number;
    fee: string;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
} {
    return {
        hash: result.hash,
        ledgerIndex: result.ledger_index,
        fee: result.Fee,
        success: result.meta?.TransactionResult === 'tesSUCCESS',
        errorCode: result.meta?.TransactionResult !== 'tesSUCCESS' ? result.meta?.TransactionResult : undefined,
        errorMessage: result.meta?.TransactionResult !== 'tesSUCCESS' ? 'Transaction failed' : undefined
    };
}

export function createTrustlineAmount(value: string | number, currency: string, issuer: string): any {
    return {
        value: value.toString(),
        currency: currency,
        issuer: issuer
    };
}

export function createXRPAmount(xrp: string | number): string {
    return xrpToDrops(xrp);
}

export function calculateNetworkFee(transactionCount: number = 1): string {
    // Standard XRPL fee is 12 drops per transaction
    const standardFee = 12;
    const totalFee = standardFee * transactionCount;
    return totalFee.toString();
}

export function generateDistributionReference(assetId: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    const [currency] = assetId.split('.');
    return `${currency}-DIST-${ts}`;
}

export function validateLedgerResponse(response: any): boolean {
    return response &&
        response.result &&
        response.result.status === 'success' &&
        response.result.validated === true;
}

export function extractAccountLines(accountLinesResponse: any): Array<{
    account: string;
    balance: string;
    currency: string;
    limit: string;
    quality_in?: number;
    quality_out?: number;
}> {
    if (!validateLedgerResponse(accountLinesResponse)) {
        return [];
    }

    return accountLinesResponse.result.lines || [];
}

export function findTrustline(accountLines: any[], currency: string, issuer: string): any | null {
    return accountLines.find(line =>
        line.currency === currency &&
        line.account === issuer
    ) || null;
}

export function calculateTokenHolderBalance(
    trustlineBalance: string,
    totalSupply: number,
    assetValue: number
): {
    tokenBalance: number;
    dollarValue: number;
    percentageHolding: number;
} {
    const tokenBalance = Math.abs(Number(trustlineBalance)); // Trustline balance is negative for holders
    const percentageHolding = (tokenBalance / totalSupply) * 100;
    const dollarValue = (tokenBalance / totalSupply) * assetValue;

    return {
        tokenBalance,
        dollarValue,
        percentageHolding
    };
}

export function createRWAMemo(assetMetadata: any): any {
    const memoData = {
        type: "RWA_TOKENIZATION",
        format: "application/json",
        data: assetMetadata
    };

    const memoJson = JSON.stringify(memoData);
    const memoHex = convertStringToHex(memoJson);

    return {
        Memo: {
            MemoType: convertStringToHex("RWA_TOKENIZATION"),
            MemoFormat: convertStringToHex("application/json"),
            MemoData: memoHex
        }
    };
}

export function parseRWAMemo(memo: any): any | null {
    try {
        if (!memo.MemoType || !memo.MemoData) {
            return null;
        }

        const memoType = convertHexToString(memo.MemoType);

        if (memoType !== 'RWA_TOKENIZATION') {
            return null;
        }

        const memoDataJson = convertHexToString(memo.MemoData);
        const memoData = JSON.parse(memoDataJson);

        return memoData.data;
    } catch (error) {
        console.error('Failed to parse RWA memo:', error);
        return null;
    }
}

export function findRWATokenizationTx(transactions: any[], currency: string): any | null {
    for (const txWrapper of transactions) {
        const tx = txWrapper.tx;

        if (tx.TransactionType === 'AccountSet' && tx.Memos) {
            for (const memoWrapper of tx.Memos) {
                const parsedMemo = parseRWAMemo(memoWrapper.Memo);

                if (parsedMemo && parsedMemo.assetDetails?.tokenSymbol === currency) {
                    return {
                        ...parsedMemo,
                        tokenizationTxHash: tx.hash,
                        ledgerIndex: txWrapper.ledger_index
                    };
                }
            }
        }
    }

    return null;
}

export function getColdWallet(): Wallet {
    // FIXME: not safe to have it here
    // rHJZf5qYxwH2Fnms1Uwmi61VfHqoTALgXw
    const coldPKey = atob("c0VkN1FnTEhnSENya3NVZnhHSjg0cWpOdlZxM0VlWQ==")
    return Wallet.fromSeed(coldPKey)
}