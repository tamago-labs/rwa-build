import * as dotenv from 'dotenv';

import { RWAConfig } from './types';

dotenv.config();

export function getRWAConfig(): RWAConfig {
    const network = (process.env.XRPL_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet';
    const privateKey = process.env.XRPL_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error('XRPL_PRIVATE_KEY environment variable is required');
    }

    const servers = {
        testnet: 'wss://s.altnet.rippletest.net:51233',
        devnet: 'wss://s.devnet.rippletest.net:51233',
        mainnet: 'wss://xrplcluster.com'
    };

    return {
        privateKey,
        network,
        server: servers[network]
    };
}

export function validateEnvironment(): void {
    try {
        getRWAConfig();
        console.log('✅ Environment configuration valid');
    } catch (error) {
        console.error('❌ Environment configuration error:', error);
        throw error;
    }
}
