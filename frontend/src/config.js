// Application configuration
export const CONFIG = {
    CONTRACT_ID: import.meta.env.VITE_CONTRACT_ID || "CC5RS5GXAPO7NW27U65XXHKSEWO4ODYX5WLYDHCPBOX4XVXBP7LRFWQ2",
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "http://localhost:4000",
    NETWORK: import.meta.env.VITE_NETWORK || "TESTNET",
    HORIZON_URL: "https://horizon-testnet.stellar.org",
    SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
    STELLAR_EXPERT_URL: "https://stellar.expert/explorer/testnet",
};

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
