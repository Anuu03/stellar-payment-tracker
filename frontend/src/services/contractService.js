import { CONFIG } from "../config";
import {
    Contract,
    TransactionBuilder,
    Networks,
    BASE_FEE,
    Account,
    nativeToScVal,
} from "@stellar/stellar-sdk";
import { Server as SorobanServer } from "@stellar/stellar-sdk/rpc";

// Lazy initialize Soroban server to avoid initialization errors
let sorobanServerInstance = null;
const getSorobanServer = () => {
    if (!sorobanServerInstance) {
        sorobanServerInstance = new SorobanServer(CONFIG.SOROBAN_RPC_URL);
    }
    return sorobanServerInstance;
};


 // Get total number of payments

export async function getTotalPayments(walletAddress) {
    try {
        // Fetch account
        const response = await fetch(`${CONFIG.HORIZON_URL}/accounts/${walletAddress}`);
        const accountData = await response.json();

        const sourceAccount = new Account(accountData.account_id, accountData.sequence);

        // Build contract call
        const contract = new Contract(CONFIG.CONTRACT_ID);
        const transaction = new TransactionBuilder(sourceAccount, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET,
        })
            .addOperation(contract.call("get_total"))
            .setTimeout(30)
            .build();

        // Simulate (no signature needed for read-only)
        const simulation = await getSorobanServer().simulateTransaction(transaction);

        if (simulation.result?.retval) {
            return Number(simulation.result.retval.value());
        }

        return 0;
    } catch (error) {
        console.error("Failed to get total payments:", error);
        return 0;
    }
}

/**
 * Get recent payments from contract
 */
export async function getRecentPayments(walletAddress, limit = 20) {
    try {
        const response = await fetch(`${CONFIG.HORIZON_URL}/accounts/${walletAddress}`);
        const accountData = await response.json();

        const sourceAccount = new Account(accountData.account_id, accountData.sequence);

        const contract = new Contract(CONFIG.CONTRACT_ID);

        // Convert limit to ScVal for Soroban
        const limitScVal = nativeToScVal(limit, { type: "u32" });

        const transaction = new TransactionBuilder(sourceAccount, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET,
        })
            .addOperation(contract.call("get_recent_payments", limitScVal))
            .setTimeout(30)
            .build();

        const simulation = await getSorobanServer().simulateTransaction(transaction);

        if (simulation.result?.retval) {
            const payments = simulation.result.retval.value();
            return parsePayments(payments);
        }

        return [];
    } catch (error) {
        console.error("Failed to get recent payments:", error);
        return [];
    }
}

/**
 * Parse payment data from contract
 */
function parsePayments(paymentsVec) {
    try {
        const payments = [];

        for (let i = 0; i < paymentsVec.length; i++) {
            const payment = paymentsVec[i];

            payments.push({
                from: payment.from().toString(),
                to: payment.to().toString(),
                amount: Number(payment.amount()) / 10000000, // Convert from stroops
                timestamp: Number(payment.timestamp()),
            });
        }

        return payments;
    } catch (error) {
        console.error("Failed to parse payments:", error);
        return [];
    }
}
