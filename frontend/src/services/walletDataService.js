import * as horizonService from './horizonService';

/**
 * WalletDataService - Centralized service for managing wallet-scoped data
 * 
 * Features:
 * - Per-wallet data cache with TTL
 * - Request deduplication (prevents duplicate fetches)
 * - AbortController for cleanup
 * - Race condition prevention
 * - Smart cache invalidation
 */
class WalletDataService {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.subscribers = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get wallet data with caching
     */
    async getWalletData(publicKey, options = {}) {
        if (!publicKey) {
            return null;
        }

        // Check cache first
        const cached = this.cache.get(publicKey);
        if (cached && !this.isStale(cached) && !options.forceRefresh) {
            console.log('[WalletDataService] Using cached data for:', publicKey.slice(0, 8));
            return cached.data;
        }

        // Deduplicate requests - if already fetching, return existing promise
        if (this.pendingRequests.has(publicKey)) {
            console.log('[WalletDataService] Request already pending for:', publicKey.slice(0, 8));
            return this.pendingRequests.get(publicKey);
        }

        // Fetch new data
        console.log('[WalletDataService] Fetching fresh data for:', publicKey.slice(0, 8));
        const promise = this.fetchWalletData(publicKey, options);
        this.pendingRequests.set(publicKey, promise);

        try {
            const data = await promise;

            // Cache the result
            this.cache.set(publicKey, {
                data,
                timestamp: Date.now()
            });

            // Notify subscribers
            this.notifySubscribers(publicKey, data);

            return data;
        } finally {
            this.pendingRequests.delete(publicKey);
        }
    }

    /**
     * Fetch wallet data from Horizon
     */
    async fetchWalletData(publicKey, options) {
        const { signal } = options;

        try {
            // Fetch transactions from Horizon
            const transactions = await horizonService.fetchPayments(publicKey, {
                limit: 50,
                order: 'desc',
                signal
            });

            // Calculate analytics
            const analytics = this.calculateAnalytics(transactions, publicKey);

            return {
                transactions,
                analytics,
                publicKey,
                fetchedAt: Date.now()
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('[WalletDataService] Fetch aborted for:', publicKey.slice(0, 8));
                throw error;
            }
            console.error('[WalletDataService] Fetch failed:', error);
            throw error;
        }
    }

    /**
     * Calculate analytics for transactions
     */
    calculateAnalytics(transactions, publicKey) {
        if (!transactions || transactions.length === 0) {
            return {
                totalSent: 0,
                totalReceived: 0,
                netFlow: 0,
                transactionCount: 0,
                sentCount: 0,
                receivedCount: 0
            };
        }

        let totalSent = 0;
        let totalReceived = 0;
        let sentCount = 0;
        let receivedCount = 0;

        transactions.forEach(payment => {
            const amount = parseFloat(payment.amount);

            if (payment.direction === 'sent') {
                totalSent += amount;
                sentCount++;
            } else if (payment.direction === 'received') {
                totalReceived += amount;
                receivedCount++;
            }
        });

        return {
            totalSent,
            totalReceived,
            netFlow: totalReceived - totalSent,
            transactionCount: transactions.length,
            sentCount,
            receivedCount
        };
    }

    /**
     * Clear data for specific wallet
     */
    clearWalletData(publicKey) {
        this.cache.delete(publicKey);
        this.pendingRequests.delete(publicKey);
        console.log('[WalletDataService] Cleared data for:', publicKey?.slice(0, 8));
    }

    /**
     * Clear all wallet data (on full disconnect)
     */
    clearAllData() {
        this.cache.clear();
        this.pendingRequests.clear();
        console.log('[WalletDataService] Cleared all wallet data');
    }

    /**
     * Invalidate cache for refresh
     */
    invalidateCache(publicKey) {
        const cached = this.cache.get(publicKey);
        if (cached) {
            cached.timestamp = 0; // Force stale
            console.log('[WalletDataService] Invalidated cache for:', publicKey.slice(0, 8));
        }
    }

    /**
     * Check if cached data is stale
     */
    isStale(cached) {
        return Date.now() - cached.timestamp > this.CACHE_TTL;
    }

    /**
     * Subscribe to wallet data changes
     */
    subscribe(publicKey, callback) {
        if (!this.subscribers.has(publicKey)) {
            this.subscribers.set(publicKey, new Set());
        }
        this.subscribers.get(publicKey).add(callback);

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(publicKey);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(publicKey);
                }
            }
        };
    }

    /**
     * Notify subscribers of data changes
     */
    notifySubscribers(publicKey, data) {
        const subs = this.subscribers.get(publicKey);
        if (subs) {
            subs.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('[WalletDataService] Subscriber error:', error);
                }
            });
        }
    }

    /**
     * Get cache stats (for debugging)
     */
    getCacheStats() {
        return {
            cachedWallets: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            subscribers: this.subscribers.size
        };
    }
}

// Singleton instance
export const walletDataService = new WalletDataService();
