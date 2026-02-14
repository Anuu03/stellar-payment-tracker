import { useMemo } from "react";

/**
 * Payment Analytics Hook
 * 
 * Calculates comprehensive analytics from payment transaction data.
 * Uses useMemo for performance optimization.
 * 
 * @param {Array} payments - Array of normalized payment objects
 * @param {string} connectedWallet - Connected wallet address
 * @returns {Object} Analytics object with computed metrics
 */
export function usePaymentAnalytics(payments, connectedWallet) {
    const analytics = useMemo(() => {
        if (!payments || payments.length === 0) {
            return {
                totalSent: 0,
                totalReceived: 0,
                netFlow: 0,
                largestTransaction: 0,
                avgTransaction: 0,
                transactionCount: 0,
                lastActivity: null,
                sentCount: 0,
                receivedCount: 0,
                assetBreakdown: {},
            };
        }

        // Separate sent and received payments
        const sent = payments.filter(p => p.direction === 'sent');
        const received = payments.filter(p => p.direction === 'received');

        // Calculate totals
        const totalSent = sent.reduce((sum, p) => sum + p.amount, 0);
        const totalReceived = received.reduce((sum, p) => sum + p.amount, 0);
        const netFlow = totalReceived - totalSent;

        // Calculate largest transaction
        const allAmounts = payments.map(p => p.amount);
        const largestTransaction = allAmounts.length > 0 ? Math.max(...allAmounts) : 0;

        // Calculate average transaction
        const totalAmount = allAmounts.reduce((sum, amt) => sum + amt, 0);
        const avgTransaction = payments.length > 0 ? totalAmount / payments.length : 0;

        // Get last activity timestamp
        const lastActivity = payments.length > 0 ? payments[0].timestamp : null;

        // Asset breakdown (group by asset)
        const assetBreakdown = payments.reduce((acc, p) => {
            const assetKey = p.asset_code || 'XLM';
            if (!acc[assetKey]) {
                acc[assetKey] = {
                    count: 0,
                    total: 0,
                    sent: 0,
                    received: 0,
                };
            }
            acc[assetKey].count++;
            acc[assetKey].total += p.amount;
            if (p.direction === 'sent') {
                acc[assetKey].sent += p.amount;
            } else {
                acc[assetKey].received += p.amount;
            }
            return acc;
        }, {});

        return {
            totalSent,
            totalReceived,
            netFlow,
            largestTransaction,
            avgTransaction,
            transactionCount: payments.length,
            lastActivity,
            sentCount: sent.length,
            receivedCount: received.length,
            assetBreakdown,
        };
    }, [payments, connectedWallet]);

    return analytics;
}

export default usePaymentAnalytics;
