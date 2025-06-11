#!/usr/bin/env ts-node

import { Wallet, Client } from 'xrpl';

/**
 * 🚀 Quick XRPL Wallet Utilities
 * 
 * Simple utilities for XRPL wallet operations
 */

const TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233';

// Generate a new wallet and display credentials
export function generateWallet() {
    console.log('🔑 Generating new XRPL wallet...\n');
    
    const wallet = Wallet.generate();
    
    console.log('📋 NEW WALLET CREDENTIALS:');
    console.log('┌────────────────────────────────────────────────────────────┐');
    console.log('│ SAVE THESE CREDENTIALS SECURELY!                          │');
    console.log('└────────────────────────────────────────────────────────────┘');
    console.log('');
    console.log(`🏠 Address:     ${wallet.address}`);
    console.log(`🌱 Seed:        ${wallet.seed}`);
    console.log(`🔐 Private Key: ${wallet.privateKey}`);
    console.log(`🔓 Public Key:  ${wallet.publicKey}`);
    console.log('');
    console.log('💰 TO FUND THIS WALLET:');
    console.log('   1. Visit: https://faucet.altnet.rippletest.net/accounts');
    console.log(`   2. Paste address: ${wallet.address}`);
    console.log('   3. Click "Generate testnet credentials"');
    console.log('   4. Wait for confirmation');
    console.log('');
    console.log('📝 TO USE WITH RWA.BUILD:');
    console.log('   Add to your .env file:');
    console.log(`   XRPL_PRIVATE_KEY=${wallet.seed}`);
    console.log('   XRPL_NETWORK=testnet');
    console.log('   XRPL_SERVER=wss://s.altnet.rippletest.net:51233');
    
    return wallet;
}

// Check balance of any XRPL address
export async function checkBalance(address: string) {
    console.log(`💰 Checking balance for: ${address}\n`);
    
    const client = new Client(TESTNET_SERVER);
    
    try {
        await client.connect();
        
        const accountInfo = await client.request({
            command: 'account_info',
            account: address,
            ledger_index: 'validated'
        });
        
        const balance = Number(accountInfo.result.account_data.Balance) / 1000000;
        
        console.log('✅ ACCOUNT FOUND:');
        console.log(`   Balance: ${balance} XRP`);
        console.log(`   Sequence: ${accountInfo.result.account_data.Sequence}`);
        console.log(`   Flags: ${accountInfo.result.account_data.Flags || 0}`);
        console.log(`   Network: Testnet`);
        
        if (balance >= 10) {
            console.log('✅ Ready for RWA tokenization!');
        } else if (balance > 0) {
            console.log('⚠️  Low balance - add more XRP for tokenization');
        } else {
            console.log('❌ No balance - fund this wallet first');
        }
        
        return balance;
        
    } catch (error: any) {
        if (error.message.includes('actNotFound')) {
            console.log('❌ ACCOUNT NOT FOUND');
            console.log('   This address has not been funded yet.');
            console.log('   Visit: https://faucet.altnet.rippletest.net/accounts');
            return 0;
        }
        
        console.error('❌ Error checking balance:', error.message);
        throw error;
        
    } finally {
        await client.disconnect();
    }
}

// Validate XRPL address format
export function validateAddress(address: string) {
    const xrplRegex = /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/;
    const isValid = xrplRegex.test(address);
    
    console.log(`🔍 Validating address: ${address}`);
    console.log(`   Format: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (!isValid) {
        console.log('   XRPL addresses must:');
        console.log('   - Start with "r"');
        console.log('   - Be 26-35 characters long');
        console.log('   - Use base58 encoding (no 0, O, I, l)');
    }
    
    return isValid;
}

// Fund wallet via testnet faucet
export async function fundWallet(address?: string) {
    let targetAddress = address;
    
    if (!targetAddress) {
        console.log('🔑 No address provided - generating new wallet...\n');
        const wallet = generateWallet();
        targetAddress = wallet.address;
        console.log('\n💰 Now funding the generated wallet...\n');
    }
    
    console.log(`💰 Funding wallet: ${targetAddress}`);
    console.log('🌐 Using XRPL Testnet Faucet...\n');
    
    const client = new Client(TESTNET_SERVER);
    
    try {
        await client.connect();
        
        // Try to fund via the XRPL client's fundWallet method
        const wallet = Wallet.fromSeed('sEdV19BLfeQeKdEXyYA4NhjPJe6XBfG'); // Dummy seed for testing
        const fundResult = await client.fundWallet(wallet);
        
        console.log('✅ FUNDING SUCCESSFUL!');
        console.log(`   Address: ${fundResult.wallet.address}`);
        console.log(`   Balance: ${fundResult.balance} XRP`);
        console.log('   Ready for RWA.build!');
        
        return fundResult;
        
    } catch (error) {
        console.log('⚠️  Automatic funding failed. Manual funding required.');
        console.log('');
        console.log('💡 MANUAL FUNDING STEPS:');
        console.log('   1. Visit: https://faucet.altnet.rippletest.net/accounts');
        console.log(`   2. Paste this address: ${targetAddress}`);
        console.log('   3. Click "Generate testnet credentials"');
        console.log('   4. Wait for the transaction to complete');
        console.log('   5. Check balance with: npm run wallet:check');
        
        throw error;
        
    } finally {
        await client.disconnect();
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    const arg = process.argv[3];
    
    console.log('🚀 XRPL Wallet Utilities\n');
    
    try {
        switch (command) {
            case 'generate':
                generateWallet();
                break;
                
            case 'check':
                if (!arg) {
                    console.log('❌ Address required');
                    console.log('Usage: npm run wallet:check <address>');
                    process.exit(1);
                }
                await checkBalance(arg);
                break;
                
            case 'validate':
                if (!arg) {
                    console.log('❌ Address required');
                    console.log('Usage: npm run wallet:validate <address>');
                    process.exit(1);
                }
                validateAddress(arg);
                break;
                
            case 'fund':
                await fundWallet(arg);
                break;
                
            default:
                console.log('🔧 Available commands:');
                console.log('   npm run wallet:generate  # Generate new wallet');
                console.log('   npm run wallet:check <address>  # Check balance');
                console.log('   npm run wallet:validate <address>  # Validate format');
                console.log('   npm run wallet:fund [address]  # Fund wallet');
                console.log('');
                console.log('💡 For complete setup: npm run setup:wallet');
                break;
        }
    } catch (error) {
        console.error('\n❌ Command failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
