import { CONFIG, NETWORK_PASSPHRASE } from "../config";
import {
    TransactionBuilder,
    Networks,
    Operation,
    Asset,
    BASE_FEE,
    Account,
    Contract,
    Address,
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

/**
 * Fetch account from Horizon
 */
async function getAccount(publicKey) {
    const response = await fetch(`${CONFIG.HORIZON_URL}/accounts/${publicKey}`);
    if (!response.ok) {
        throw new Error(`Account not found: ${publicKey}`);
    }
    return await response.json();
}

/**
 * Build XLM payment transaction
 */
export async function buildPaymentTransaction(from, to, amount) {
    const accountData = await getAccount(from);
    const account = new Account(accountData.account_id, accountData.sequence);

    const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(
            Operation.payment({
                destination: to,
                asset: Asset.native(),
                amount: amount.toString(),
            })
        )
        .setTimeout(30)
        .build();

    return transaction.toXDR();
}

/**
 * Submit XLM payment to Horizon
 */
export async function submitPaymentTransaction(signedXdr) {
    const response = await fetch(`${CONFIG.HORIZON_URL}/transactions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            tx: signedXdr,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.extras?.result_codes?.transaction || "Payment failed");
    }

    return await response.json();
}

/**
 * Prepare contract transaction (calls backend)
 */
export async function prepareContractTransaction(from, to, amount) {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/prepare-transaction`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from,
            to,
            amount: parseFloat(amount),
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw error;
    }

    return await response.json();
}

/**
 * Submit contract transaction (calls backend)
 */
export async function submitContractTransaction(signedXdr) {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/submit-transaction`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            signedXdr,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw error;
    }

    return await response.json();
}

/**
 * Poll transaction status
 */
export async function getTransactionStatus(hash) {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/transaction-status/${hash}`);

    if (!response.ok) {
        throw new Error("Failed to fetch transaction status");
    }

    return await response.json();
}

/**
 * Poll until transaction is confirmed
 * 
 * @param {string} hash Transaction hash
 * @param {AbortSignal} abortSignal Optional abort signal for cancellation
 * @param {number} maxAttempts Maximum polling attempts
 * @param {number} interval Polling interval in milliseconds
 */
export async function pollTransactionStatus(hash, abortSignal = null, maxAttempts = 30, interval = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
        // Check if aborted
        if (abortSignal?.aborted) {
            throw new Error("Transaction polling cancelled");
        }

        const status = await getTransactionStatus(hash);

        if (status.status === "SUCCESS") {
            return { success: true, result: status };
        }

        if (status.status === "FAILED") {
            return { success: false, error: status.error };
        }

        if (status.status === "TIMEOUT") {
            return { success: false, error: "Transaction timeout" };
        }

        // Still pending, wait and retry
        await new Promise((resolve) => setTimeout(resolve, interval));

        // Check again after waiting
        if (abortSignal?.aborted) {
            throw new Error("Transaction polling cancelled");
        }
    }

    return { success: false, error: "Polling timeout" };
}
