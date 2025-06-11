# RWA.build

![NPM Version](https://img.shields.io/npm/v/rwa-build)

**RWA.build** is a Model Context Protocol (MCP) server implementation that transforms real-world assets into tradeable tokens on the XRP Ledger by simply chatting with AI. Describe your asset idea and let the AI issue RWA tokens, setup AMM pools, and generate your dApp with on-chain components in minutes.

- [NPM Registry](https://www.npmjs.com/package/rwa-build) 
- [Video Demo](https://www.youtube.com/watch?v=g0U66-Sgfv8)
- [Presentation (JP)](https://github.com/tamago-labs/rwa-build/blob/main/RWA.build%20Final%20-%20XRPL%20Hackathon.pdf)

## Overview

**Model Context Protocol (MCP)** recently introduced by Claude AI, unlocks many new possibilities and allows developers to provide tools for Web3 interactions. RWA.build leverages MCP to enable creating Real-World Asset projects that require issuing tokens, setting up AMMs, establishing trustlines, and more. With MCP, all these steps can be done inside MCP-compatible clients like Claude Desktop, streamlining the entire process in minutes—including having your RWA dApp ready to use.

## Features

- 15+ MCP tools covering wallet management, asset tokenization, AMM trading, and platform generation
- Real token issuance on XRPL with on-chain metadata storage
- Native AMM integration for instant liquidity and trading
- Complete dApp generation with customizable features and wallet connectivity
- Support for real estate, bonds, commodities, and treasury securities
- Automated compliance controls and yield distribution systems

## Using with Claude Desktop

RWA.build operates in Private Key mode, where all operations (including tokenization and trading) are executed automatically without requiring additional approval.

1. Install Claude Desktop if you haven't already
2. Open Claude Desktop settings
3. Add the RWA MCP client to your configuration:

```json
{
  "mcpServers": {
    "rwa-build": {
      "command": "npx",
      "args": [
        "-y",
        "rwa-build",
        "--xrpl_private_key=YOUR_PRIVATE_KEY", 
        "--xrpl_network=testnet"
      ],
      "disabled": false
    }
  }
}
```

Private Key mode is recommended for users who can securely manage their private keys. The MCP client handles all XRPL transactions locally without exposing any data to external servers.

## Use Cases

### 1. Real Estate Tokenization & Investment
RWA.build enables property owners and investors to:

- Tokenize properties with complete metadata storage on XRPL
- Create instant liquidity through automated market makers
- Distribute fractional ownership to global investors
- Automate rental yield distribution to token holders

*Example:*
```
"Tokenize my $5M office building that generates $25,000/month in rent"
```

### 2. Fixed Income Securities Platform
Create digital bond and treasury platforms:
- Issue government and corporate bonds as tokens
- Set up automated interest payments to bondholders
- Create secondary markets for bond trading
- Manage institutional-grade compliance requirements

*Example:*
```
"Create treasury bill tokens for my $50M government bond portfolio"
```

### 3. Commodity Investment Infrastructure
Enable physical asset tokenization:
- Tokenize gold, silver, oil, and other commodities
- Verify physical backing and storage
- Create global trading access without physical storage
- Direct commodity price exposure through tokens

*Example:*
```
"Tokenize my $10M physical gold reserves for global investors"
```

### 4. Complete Investment Platform Generation
Generate professional dApps for asset management:
- Create investor portals with trading interfaces
- Build analytics dashboards and portfolio tracking
- Integrate multiple wallet connections (XUMM, MetaMask)
- Deploy production-ready platforms in minutes

*Example:*
```
"Generate a professional real estate investment platform for my tokenized properties"
```

## Background

Traditional real-world asset tokenization requires complex legal structures, expensive intermediaries, and months of development. Existing platforms often lack liquidity, have high barriers to entry, and require extensive technical knowledge.

Model Context Protocol (MCP), introduced by Claude AI in late 2024, revolutionizes this process by enabling natural language interaction with complex blockchain operations. RWA.build leverages MCP to make asset tokenization as simple as having a conversation, while maintaining professional-grade compliance and functionality.

## Available Tools

### Wallet Operations
| Tool Name | Description | Example Usage |
|-----------|-------------|---------------|
| `rwa_get_wallet_info` | Get wallet address and XRP balance | "What's my wallet address and balance?" |
| `rwa_get_account_balances` | Get all XRP and token balances | "Show all my token holdings" |
| `rwa_validate_address` | Validate XRPL address format | "Is this a valid XRPL address: rABC..." |
| `rwa_get_transaction_history` | View complete transaction history | "Show my recent transactions" |

### Asset Tokenization
| Tool Name | Description | Example Usage |
|-----------|-------------|---------------|
| `rwa_tokenize_asset` | Create RWA tokens with metadata | "Tokenize my $2M apartment building" |
| `rwa_get_asset_info` | Retrieve asset information and metadata | "Get details about my BLD tokens" |
| `rwa_send_rwa_token` | Send tokens to investors | "Send 50 BLD tokens to rInvestor123..." |

### AMM Trading & Liquidity
| Tool Name | Description | Example Usage |
|-----------|-------------|---------------|
| `rwa_create_amm` | Create token/XRP trading pools | "Create AMM pool for my building tokens" |
| `rwa_swap_amm` | Trade tokens via automated market maker | "Swap 10000 XRP for BLD tokens" |
| `rwa_add_liquidity_amm` | Provide liquidity and earn fees | "Add liquidity to my BLD/XRP pool" |
| `rwa_remove_liquidity_amm` | Exit liquidity positions | "Remove 50% of my liquidity position" |

### Basic Operations
| Tool Name | Description | Example Usage |
|-----------|-------------|---------------|
| `rwa_send_xrp` | Send XRP payments | "Send 1000 XRP to rAddress123..." |
| `rwa_create_trustline` | Set up token receiving capability | "Create trustline for BLD tokens" |

### Platform Generation
| Tool Name | Description | Example Usage |
|-----------|-------------|---------------|
| `rwa_generate_webapp_project` | Generate complete investment platforms | "Create a professional dApp for my tokens" |

## Troubleshooting

If you're using Ubuntu or another Linux environment with NVM, you'll need to manually configure the path. Follow these steps:

1. Install RWA.build under your current NVM-managed Node.js version:

```bash
npm install -g rwa-build
```

2. Use absolute paths in your Claude Desktop config:

```json
{
  "mcpServers": {
    "rwa-build": {
      "command": "/home/YOUR_NAME/.nvm/versions/node/YOUR_NODE_VERSION/bin/node",
      "args": [
        "/home/YOUR_NAME/.nvm/versions/node/YOUR_NODE_VERSION/bin/rwa-build",
        "--xrpl_private_key=YOUR_PRIVATE_KEY",
        "--xrpl_network=testnet"
      ]
    }
  }
}
```

3. Restart Claude Desktop and it should work now.

## Work with Local Files

When generating dApps and working with project files, you'll need to import the `filesystem` MCP server:

```json
"filesystem": {
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "${workspaceFolder}"
  ],
  "disabled": false
}
```

This enables the AI to read, write, and manage files for your generated RWA platforms.

## License

This project is licensed under the MIT License.