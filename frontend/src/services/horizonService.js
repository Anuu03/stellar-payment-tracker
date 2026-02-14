import { CONFIG } from "../config";

/**
 * Horizon Service Layer
 * 
 * Production-grade Horizon API integration for fetching real blockchain transaction data.
 * Handles payment fetching, normalization, deduplication, pagination, and error handling.
 */

// Horizon Server instance (lazy initialization)
let horizonServer = null;

/**
 * Get or create Horizon server instance
 */
function getHorizonServer() {
    if (!horizonServer) {
        // Use fetch-based approach for better error handling
        horizonServer = {
            baseUrl: CONFIG.HORIZON_URL,
        };
    }
    return horizonServer;
}

/**
 * Fetch payments for a specific account from Horizon
 * 
 * @param {string} publicKey - Stellar public key
 * @param {Object} options - Fetch options
 * @param {number} options.limit - Max number of payments to fetch (default: 50)
 * @param {string} options.cursor - Pagination cursor
 * @param {string} options.order - 'asc' or 'desc' (default: 'desc')
 * @returns {Promise<Array>} Normalized payment array
 */
export async function fetchPayments(publicKey, options = {}) {
    const { limit = 50, cursor = null, order = 'desc', signal } = options;

    try {
        const server = getHorizonServer();

        // Build URL with query parameters
        let url = `${server.baseUrl}/accounts/${publicKey}/payments?limit=${limit}&order=${order}`;

        if (cursor) {
            url += `&cursor=${cursor}`;
        }

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
            signal // Pass AbortController signal for cancellation
        });

        // Handle rate limiting
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || 60;
            console.warn(`Rate limited. Retrying after ${retryAfter}s`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return fetchPayments(publicKey, { ...options, signal });
        }

        if (!response.ok) {
            throw new Error(`Horizon request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Validate response structure
        if (!data._embedded || !Array.isArray(data._embedded.records)) {
            console.warn('Invalid Horizon response structure', data);
            return [];
        }

        // Normalize all payments
        const payments = data._embedded.records
            .map(record => normalizeTransaction(record, publicKey))
            .filter(p => p !== null); // Filter out invalid transactions

        return payments;

    } catch (error) {
        // Re-throw AbortError to allow caller to handle it
        if (error.name === 'AbortError') {
            console.log('[HorizonService] Fetch aborted for', publicKey.slice(0, 8));
            throw error;
        }

        console.error('Failed to fetch payments from Horizon:', error);

        // Return empty array on error (graceful degradation)
        return [];
    }
}

/**
 * Normalize Horizon payment response to application format
 * 
 * @param {Object} horizonPayment - Raw Horizon payment record
 * @param {string} connectedWallet - Connected wallet address (to determine direction)
 * @returns {Object|null} Normalized payment object
 */
export function normalizeTransaction(horizonPayment, connectedWallet) {
    try {
        // Validate required fields
        if (!horizonPayment.id || !horizonPayment.transaction_hash) {
            console.warn('Invalid payment: missing required fields', horizonPayment);
            return null;
        }

        // Determine payment type
        const type = horizonPayment.type || 'payment';

        // Extract source and destination based on type
        let from, to, amount, assetType, assetCode;

        if (type === 'payment' || type === 'create_account') {
            from = horizonPayment.from || horizonPayment.source_account;
            to = horizonPayment.to || horizonPayment.account;
            amount = parseFloat(horizonPayment.amount || horizonPayment.starting_balance || '0');
            assetType = horizonPayment.asset_type || 'native';
            assetCode = horizonPayment.asset_code || null;
        } else if (type === 'path_payment_strict_send' || type === 'path_payment_strict_receive') {
            from = horizonPayment.from;
            to = horizonPayment.to;
            amount = parseFloat(horizonPayment.amount || '0');
            assetType = horizonPayment.asset_type;
            assetCode = horizonPayment.asset_code || null;
        } else {
            // Unsupported operation type for now
            return null;
        }

        // Determine direction (sent or received)
        const direction = from === connectedWallet ? 'sent' : 'received';
        const counterparty = from === connectedWallet ? to : from;

        // Parse timestamp
        const timestamp = new Date(horizonPayment.created_at).getTime();

        // Build normalized transaction
        const normalized = {
            id: horizonPayment.id,
            hash: horizonPayment.transaction_hash,
            type,
            from,
            to,
            amount,
            asset_type: assetType,
            asset_code: assetCode,
            memo: null, // Memos are at transaction level, not operation level
            timestamp,
            created_at: horizonPayment.created_at,
            ledger: horizonPayment.ledger_attr || null,
            successful: horizonPayment.transaction_successful !== false,
            paging_token: horizonPayment.paging_token,

            // Computed fields
            direction,
            counterparty,
        };

        return normalized;

    } catch (error) {
        console.error('Failed to normalize transaction:', error, horizonPayment);
        return null;
    }
}

/**
 * Deduplicate payments by ID
 * 
 * @param {Array} newPayments - New payments to add
 * @param {Array} existingPayments - Existing payments
 * @param {number} maxRecords - Maximum number of records to keep (default: 200)
 * @returns {Array} Deduplicated and sorted payments
 */
export function deduplicatePayments(newPayments, existingPayments, maxRecords = 200) {
    // Create Set of existing IDs for O(1) lookup
    const existingIds = new Set(existingPayments.map(p => p.id));

    // Filter out duplicates from new payments
    const uniqueNew = newPayments.filter(p => !existingIds.has(p.id));

    // Merge arrays
    const merged = [...uniqueNew, ...existingPayments];

    // Sort by timestamp descending (newest first)
    merged.sort((a, b) => b.timestamp - a.timestamp);

    // Limit to maxRecords
    return merged.slice(0, maxRecords);
}

/**
 * Fetch all payments with pagination (up to maxRecords)
 * 
 * @param {string} publicKey - Stellar public key
 * @param {number} maxRecords - Maximum total records to fetch (default: 200)
 * @returns {Promise<Array>} All fetched payments
 */
export async function fetchAllPayments(publicKey, maxRecords = 200) {
    const batchSize = 50; // Horizon limit per request
    let allPayments = [];
    let cursor = null;
    let hasMore = true;

    try {
        while (hasMore && allPayments.length < maxRecords) {
            const batch = await fetchPayments(publicKey, {
                limit: batchSize,
                cursor,
                order: 'desc',
            });

            if (batch.length === 0) {
                hasMore = false;
                break;
            }

            allPayments = [...allPayments, ...batch];

            // Get cursor from last record for next batch
            if (batch.length === batchSize) {
                cursor = batch[batch.length - 1].paging_token;
            } else {
                hasMore = false;
            }

            // Prevent infinite loops
            if (allPayments.length >= maxRecords) {
                hasMore = false;
            }
        }

        return allPayments.slice(0, maxRecords);

    } catch (error) {
        console.error('Failed to fetch all payments:', error);
        return allPayments; // Return what we got so far
    }
}

/**
 * Create a payment stream for real-time updates (optional advanced feature)
 * 
 * @param {string} publicKey - Stellar public key
 * @param {Function} onPayment - Callback for new payments
 * @param {Function} onError - Error callback
 * @returns {Function} Cleanup function to close stream
 */
export function createPaymentStream(publicKey, onPayment, onError) {
    // Note: This requires EventSource or Horizon SDK streaming support
    // For now, return a no-op cleanup function
    // TODO: Implement when streaming is needed

    console.warn('Payment streaming not yet implemented. Using polling instead.');

    return () => {
        // Cleanup function
    };
}

/**
 * Validate payment object has required fields
 * 
 * @param {Object} payment - Payment to validate
 * @returns {boolean} True if valid
 */
export function validatePayment(payment) {
    if (!payment || typeof payment !== 'object') {
        return false;
    }

    const required = ['id', 'hash', 'from', 'to', 'amount', 'timestamp'];

    for (const field of required) {
        if (payment[field] === undefined || payment[field] === null) {
            console.warn(`Payment missing required field: ${field}`, payment);
            return false;
        }
    }

    // Validate amount is a number
    if (typeof payment.amount !== 'number' || isNaN(payment.amount)) {
        console.warn('Invalid amount in payment', payment);
        return false;
    }

    return true;
}

export default {
    fetchPayments,
    fetchAllPayments,
    normalizeTransaction,
    deduplicatePayments,
    createPaymentStream,
    validatePayment,
};
