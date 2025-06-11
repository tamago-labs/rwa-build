
// Wallet Tools
import { GetWalletInfoTool } from "./wallet/get_wallet_info_tool";
import { GetAccountBalancesTool } from "./wallet/get_account_balances_tool"; 
import { SendXRPTool } from "./wallet/send_xrp_tool";
import { CreateTrustlineTool } from "./wallet/create_trustline_tool";
import { GetTransactionHistoryTool } from "./wallet/get_transaction_history_tool";
import { ValidateAddressTool } from "./wallet/validate_address_tool";

// RWA Tools 
import { TokenizeAssetTool } from "./rwa/tokenize_asset_tool"
import { GetAssetInfoTool } from "./rwa/get_asset_info_tool";
// import { GetRWABalancesTool } from "./rwa/get_rwa_balances_tool";

export const RWAMcpTools = {  
    // Wallet operations 
    "GetWalletInfoTool": GetWalletInfoTool,          // XRPL account data
    "GetAccountBalancesTool": GetAccountBalancesTool,// Real token balances 
    "SendXRPTool": SendXRPTool,                      // Real XRP payments
    "CreateTrustlineTool": CreateTrustlineTool,      // Real trustline creation
    "GetTransactionHistoryTool": GetTransactionHistoryTool, // Real transaction data
    "ValidateAddressTool": ValidateAddressTool,      // Real address validation

    // RWA operations
    "TokenizeAssetTool": TokenizeAssetTool,     // Real asset tokenization
    // "GetRWABalancesTool": GetRWABalancesTool,   // Comprehensive RWA portfolio analysis
    "GetAssetInfoTool": GetAssetInfoTool,    // Enhanced asset information with RWA balances
};
