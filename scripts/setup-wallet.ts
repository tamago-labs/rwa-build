#!/usr/bin/env ts-node

import { Client, Wallet } from 'xrpl';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🚀 Complete RWA.build Setup Script
 * 
 * One-command setup for RWA.build development:
 * 1. Generates XRPL testnet wallet
 * 2. Funds via faucet
 * 3. Creates .env configuration
 * 4. Verifies setup
 * 5. Ready to build!
 */

const TESTNET_SERVER = 'wss://s.altnet.rippletest.net:51233';

async function setupRWABuild() {
    console.log('🏗️ RWA.build Complete Setup\n');
    console.log('This will set up everything you need to start building!');
    console.log('───────────────────────────────────────────────────────\n');

    const client = new Client(TESTNET_SERVER);

    try {
        // STEP 1: Connect to XRPL
        console.log('🔗 STEP 1: Connecting to XRPL Testnet...');
        await client.connect();
        console.log('✅ Connected to XRPL Testnet\n');

        // STEP 2: Generate wallet
        console.log('🔑 STEP 2: Generating your XRPL wallet...');
        const wallet = Wallet.generate();
        console.log('✅ New wallet generated'); 
        console.log(" Generated :", wallet) 

        // STEP 3: Fund wallet
        console.log('💰 STEP 3: Funding wallet with testnet XRP...');
        try {
            const fundResult = await client.fundWallet(wallet);
            console.log('✅ Wallet funded successfully!');
            console.log(`   Balance: ${fundResult.balance} XRP`);
            console.log('   Ready for tokenization!\n');
        } catch (fundError) {
            console.log('⚠️  Auto-funding failed, checking manually...');

            // Wait and check if funded
            await new Promise(resolve => setTimeout(resolve, 5000));

            try {
                const accountInfo = await client.request({
                    command: 'account_info',
                    account: wallet.address,
                    ledger_index: 'validated'
                });

                const balance = Number(accountInfo.result.account_data.Balance) / 1000000;
                if (balance > 0) {
                    console.log(`✅ Wallet funded! Balance: ${balance} XRP\n`);
                } else {
                    throw new Error('Not funded');
                }
            } catch (checkError) {
                console.log('❌ Automatic funding failed');
                console.log('📝 Manual funding required:');
                console.log(`   1. Visit: https://faucet.altnet.rippletest.net/accounts`);
                console.log(`   2. Enter address: ${wallet.address}`);
                console.log(`   3. Click "Generate testnet credentials"`);
                console.log(`   4. Run: npm run wallet:check ${wallet.address}\n`);
            }
        }

        // STEP 4: Create .env file
        console.log('📄 STEP 4: Creating .env configuration...');

        const envPath = path.join(process.cwd(), '.env');
        const envContent = `# RWA.build Configuration - Generated ${new Date().toISOString()}
# XRPL Testnet Setup

# Wallet Configuration
XRPL_PRIVATE_KEY=${wallet.seed}
XRPL_NETWORK=testnet
XRPL_SERVER=${TESTNET_SERVER}

# Wallet Details (for reference)
# Address: ${wallet.address}
# Network: XRPL Testnet
# Generated: ${new Date().toISOString()}

# Security Note: Keep this file secure and never commit to version control!
`;

        fs.writeFileSync(envPath, envContent);
        console.log('✅ .env file created with your credentials\n');

        // STEP 5: Verify setup
        console.log('🔍 STEP 5: Verifying setup...');

        // Test RWA Agent initialization
        try {
            const { RWAAgent } = await import('../src/agent');
            const agent = new RWAAgent();
            await agent.connect();

            const walletInfo = await agent.getWalletInfo();
            const balance = Number(walletInfo.account_data.Balance) / 1000000;

            console.log('✅ RWA Agent initialized successfully');
            console.log(`   Wallet: ${agent.wallet.address}`);
            console.log(`   Balance: ${balance} XRP`);
            console.log(`   Network: ${agent.network}\n`);

            await agent.disconnect();

        } catch (error: any) {
            console.log('⚠️  RWA Agent verification failed:', error.message);
            console.log('   Configuration saved, manual verification needed\n');
        }

        // STEP 6: Setup complete!
        console.log('🎉 SETUP COMPLETE! Your RWA.build environment is ready!\n'); 
        console.log('🌟 Happy building with RWA.build! 🌟');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        console.log('');
        console.log('🛠️  Troubleshooting:');
        console.log('   1. Check internet connection');
        console.log('   2. Verify XRPL testnet is accessible');
        console.log('   3. Try manual wallet generation: npm run wallet:generate');
        console.log('   4. Check our documentation for help');

    } finally {
        await client.disconnect();
    }
}

// CLI handling
if (require.main === module) { 
    setupRWABuild().catch(console.error);
}

export { setupRWABuild };
