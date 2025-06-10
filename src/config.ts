import * as dotenv from 'dotenv';

import { RWAConfig } from './types';

dotenv.config();

const getArgs = () =>
    process.argv.reduce((args: any, arg: any) => {
        // long arg
        if (arg.slice(0, 2) === "--") {
            const longArg = arg.split("=");
            const longArgFlag = longArg[0].slice(2);
            const longArgValue = longArg.length > 1 ? longArg[1] : true;
            args[longArgFlag] = longArgValue;
        }
        // flags
        else if (arg[0] === "-") {
            const flags = arg.slice(1).split("");
            flags.forEach((flag: any) => {
                args[flag] = true;
            });
        }
        return args;
    }, {});

export function getRWAConfig(): RWAConfig {

    const args = getArgs();
 
    const hasPrivateKey = !!(args?.xrpl_private_key || process.env.XRPL_PRIVATE_KEY); 
    const network = ((args?.xrpl_network || process.env.XRPL_NETWORK) || 'testnet') as 'testnet' | 'mainnet' | 'devnet';

    if (!hasPrivateKey) {
        throw new Error('XRPL_PRIVATE_KEY environment variable is required');
    }

    const servers = {
        testnet: 'wss://s.altnet.rippletest.net:51233',
        devnet: 'wss://s.devnet.rippletest.net:51233',
        mainnet: 'wss://xrplcluster.com'
    };

    return {
        privateKey: args?.xrpl_private_key || process.env.XRPL_PRIVATE_KEY,
        network,
        server: servers[network]
    };
}

export function validateEnvironment(): void {
    try {
        getRWAConfig();
        console.error('✅ Environment configuration valid');
    } catch (error) {
        console.error('❌ Environment configuration error:', error);
        throw error;
    }
}
