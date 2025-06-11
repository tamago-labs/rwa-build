#!/usr/bin/env node

import { validateEnvironment } from './config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RWAMcpTools } from "./mcp"
import { RWAAgent } from './agent';

/**
 * Creates an MCP server for RWA tokenization on XRPL
 */
function createMcpServer(agent: RWAAgent) {
    // Create MCP server instance
    const server = new McpServer({
        name: "rwa-build",
        version: "0.1.0"
    });

    // Register all RWA tools
    for (const [_key, tool] of Object.entries(RWAMcpTools)) {
        server.tool(tool.name, tool.description, tool.schema, async (params: any): Promise<any> => {
            try {
                // Execute the handler with the params directly
                const result = await tool.handler(agent, params);

                // Format the result as MCP tool response
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            } catch (error) {
                console.error("Tool execution error:", error);
                // Handle errors in MCP format
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: error instanceof Error
                                ? error.message
                                : "Unknown error occurred",
                        },
                    ],
                };
            }
        });
    }

    return server;
}

async function main() {
    try {
        console.error("🏗️ Starting RWA.build MCP Server...");

        // Validate environment before proceeding
        validateEnvironment();

        // Create RWA agent
        const rwaAgent = new RWAAgent();

        // Create and start MCP server
        const server = createMcpServer(rwaAgent);
        const transport = new StdioServerTransport();
        await server.connect(transport);

        console.error("✅ RWA.build MCP Server is running!");
        console.error("🎯 Available tools (8 functional):");
        
        console.error("\n📊 Core Operations:");
        console.error("   • rwa_tokenize_asset - Set up issuer account (partial)");
        console.error("   • rwa_distribute_yield - Send XRP yield payments ✅");
        
        console.error("\n💳 Wallet Management (6 tools - all functional):");
        console.error("   • rwa_get_wallet_info - Get wallet address and balance ✅");
        console.error("   • rwa_send_xrp - Send XRP payments ✅");
        console.error("   • rwa_create_trustline - Create trustlines for tokens ✅");
        console.error("   • rwa_get_account_balances - Check all balances ✅");
        console.error("   • rwa_get_transaction_history - View transaction history ✅");
        console.error("   • rwa_validate_address - Validate XRPL addresses ✅");
        
        console.error("");
        console.error("💡 Try: 'Check my wallet balance and create trustline for BLD tokens'");
        console.error("💰 Try: 'Send 100 XRP yield distribution to 5 token holders'");

    } catch (error) {
        console.error('❌ Error starting RWA.build MCP server:', error);
        process.exit(1);
    }
}

main();
