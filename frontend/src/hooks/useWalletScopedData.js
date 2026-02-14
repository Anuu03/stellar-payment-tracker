import { useState, useEffect, useCallback, useRef } from 'react';
import { walletDataService } from '../services/walletDataService';

/**
 * useWalletScopedData - React hook for wallet-scoped data with proper lifecycle
 * 
 * Features:
 * - Auto-fetch on publicKey change
 * - Auto-cleanup on unmount
 * - Abort pending requests on re-fetch
 * - Loading states per wallet
 * - Error handling per wallet
 * - Cached data for instant wallet switching
 * 
 * @param {string} publicKey - Stellar public key
 * @returns {Object} - { transactions, analytics, isLoading, error, refetch }
 */
export function useWalletScopedData(publicKey) {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);
    const currentPublicKeyRef = useRef(publicKey);

    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!publicKey) {
            setData(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        // Abort previous request if publicKey changed
        if (abortControllerRef.current) {
            console.log('[useWalletScopedData] Aborting previous request');
            abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        const currentAbortController = abortControllerRef.current;

        setIsLoading(true);
        setError(null);

        try {
            const walletData = await walletDataService.getWalletData(publicKey, {
                forceRefresh,
                signal: currentAbortController.signal
            });

            // Only update state if request wasn't aborted AND publicKey hasn't changed
            if (!currentAbortController.signal.aborted && currentPublicKeyRef.current === publicKey) {
                setData(walletData);
                setError(null);
            }
        } catch (err) {
            // Only set error if not aborted AND publicKey hasn't changed
            if (err.name !== 'AbortError' &&
                !currentAbortController.signal.aborted &&
                currentPublicKeyRef.current === publicKey) {
                setError(err);
                console.error('[useWalletScopedData] Failed to fetch wallet data:', err);
            }
        } finally {
            // Only update loading if not aborted AND publicKey hasn't changed
            if (!currentAbortController.signal.aborted && currentPublicKeyRef.current === publicKey) {
                setIsLoading(false);
            }
        }
    }, [publicKey]);

    // Effect: Fetch data when publicKey changes
    useEffect(() => {
        // Update current publicKey ref
        currentPublicKeyRef.current = publicKey;

        // Fetch data for new publicKey
        fetchData();

        // Cleanup function
        return () => {
            if (abortControllerRef.current) {
                console.log('[useWalletScopedData] Cleanup: Aborting request for', publicKey?.slice(0, 8));
                abortControllerRef.current.abort();
            }
        };
    }, [fetchData]);

    // Refetch function (with force refresh)
    const refetch = useCallback(() => {
        console.log('[useWalletScopedData] Manual refetch for', publicKey?.slice(0, 8));
        fetchData(true);
    }, [fetchData]);

    return {
        transactions: data?.transactions || [],
        analytics: data?.analytics || {
            totalSent: 0,
            totalReceived: 0,
            netFlow: 0,
            transactionCount: 0,
            sentCount: 0,
            receivedCount: 0
        },
        isLoading,
        error,
        refetch,
        lastFetched: data?.fetchedAt || null
    };
}
