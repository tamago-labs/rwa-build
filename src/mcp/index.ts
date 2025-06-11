// Core RWA Tools - FUNCTIONAL ONLY 
// import { DistributeYieldTool } from "./core/distribute_yield_tool";

// Wallet Tools - ALL FUNCTIONAL
import { GetWalletInfoTool } from "./wallet/get_wallet_info_tool";
import { GetAccountBalancesTool } from "./wallet/get_account_balances_tool";
import { SendXRPTool } from "./wallet/send_xrp_tool";
import { CreateTrustlineTool } from "./wallet/create_trustline_tool";
import { GetTransactionHistoryTool } from "./wallet/get_transaction_history_tool";
import { ValidateAddressTool } from "./wallet/validate_address_tool";

// RWA Tools 
import { TokenizeAssetTool } from "./rwa/tokenize_asset_tool"

export const RWAMcpTools = {
    // Core tokenization - LIMITED BUT FUNCTIONAL 
    // "DistributeYieldTool": DistributeYieldTool,      // Real XRP payments ✅

    // Wallet operations 
    "GetWalletInfoTool": GetWalletInfoTool,          // Real XRPL account data
    "GetAccountBalancesTool": GetAccountBalancesTool,// Real token balances
    "SendXRPTool": SendXRPTool,                      // Real XRP payments
    "CreateTrustlineTool": CreateTrustlineTool,      // Real trustline creation
    "GetTransactionHistoryTool": GetTransactionHistoryTool, // Real transaction data
    "ValidateAddressTool": ValidateAddressTool,      // Real address validation

    // RWA operations
    "TokenizeAssetTool": TokenizeAssetTool
};
