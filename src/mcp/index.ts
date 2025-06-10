// Core RWA Tools
import { TokenizeAssetTool } from "./core/tokenize_asset_tool";
import { SetupYieldDistributionTool } from "./core/setup_yield_distribution_tool";
import { DistributeYieldTool } from "./core/distribute_yield_tool";
import { GetAssetInfoTool } from "./core/get_asset_info_tool";

// Wallet Tools
import { GetWalletInfoTool } from "./wallet/get_wallet_info_tool";
import { GetAccountBalancesTool } from "./wallet/get_account_balances_tool";
import { SendXRPTool } from "./wallet/send_xrp_tool";
import { CreateTrustlineTool } from "./wallet/create_trustline_tool";
import { GetTransactionHistoryTool } from "./wallet/get_transaction_history_tool";
import { ValidateAddressTool } from "./wallet/validate_address_tool";

// Webapp Generation Tools
import { GenerateWebappProjectTool } from "./webapp/generate_webapp_project_tool";
import { IntegrateWalletTool } from "./webapp/integrate_wallet_tool";
import { SetupTokenizationTool } from "./webapp/setup_tokenization_tool";

export const RWAMcpTools = {
    // Core tokenization tools
    "TokenizeAssetTool": TokenizeAssetTool,
    "SetupYieldDistributionTool": SetupYieldDistributionTool,
    "DistributeYieldTool": DistributeYieldTool,
    "GetAssetInfoTool": GetAssetInfoTool,
    
    // Wallet management tools
    "GetWalletInfoTool": GetWalletInfoTool,
    "GetAccountBalancesTool": GetAccountBalancesTool,
    "SendXRPTool": SendXRPTool,
    "CreateTrustlineTool": CreateTrustlineTool,
    "GetTransactionHistoryTool": GetTransactionHistoryTool,
    "ValidateAddressTool": ValidateAddressTool,
    
    // Webapp generation tools
    "GenerateWebappProjectTool": GenerateWebappProjectTool,
    "IntegrateWalletTool": IntegrateWalletTool,
    "SetupTokenizationTool": SetupTokenizationTool,
    
    // More tools will be added here:
    // Trading tools, compliance tools, analytics tools
};
