import { useState, useMemo, useCallback } from "react";

/**
 * Payment Filters Hook
 * 
 * Provides advanced filtering and sorting for payment transactions.
 * Uses useMemo for performance optimization.
 * 
 * @param {Array} payments - Array of payment objects
 * @returns {Object} Filtered payments and filter controls
 */
export function usePaymentFilters(payments) {
    // Filter state
    const [filters, setFilters] = useState({
        direction: 'all', // 'all' | 'sent' | 'received'
        dateRange: { start: null, end: null },
        amountRange: { min: null, max: null },
        assetCode: null,
        searchHash: '',
    });

    // Sort state
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'amount'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

    // Apply filters
    const filteredPayments = useMemo(() => {
        let result = [...payments];

        // Direction filter
        if (filters.direction !== 'all') {
            result = result.filter(p => p.direction === filters.direction);
        }

        // Date range filter
        if (filters.dateRange.start) {
            result = result.filter(p => p.timestamp >= filters.dateRange.start);
        }
        if (filters.dateRange.end) {
            result = result.filter(p => p.timestamp <= filters.dateRange.end);
        }

        // Amount range filter
        if (filters.amountRange.min !== null && filters.amountRange.min !== '') {
            result = result.filter(p => p.amount >= parseFloat(filters.amountRange.min));
        }
        if (filters.amountRange.max !== null && filters.amountRange.max !== '') {
            result = result.filter(p => p.amount <= parseFloat(filters.amountRange.max));
        }

        // Asset filter
        if (filters.assetCode) {
            const assetKey = filters.assetCode === 'XLM' ? null : filters.assetCode;
            result = result.filter(p => p.asset_code === assetKey);
        }

        // Hash search (case-insensitive partial match)
        if (filters.searchHash) {
            const searchLower = filters.searchHash.toLowerCase();
            result = result.filter(p =>
                p.hash?.toLowerCase().includes(searchLower) ||
                p.id?.toLowerCase().includes(searchLower)
            );
        }

        return result;
    }, [payments, filters]);

    // Apply sorting
    const sortedPayments = useMemo(() => {
        const sorted = [...filteredPayments];

        sorted.sort((a, b) => {
            let compareValue = 0;

            if (sortBy === 'date') {
                compareValue = a.timestamp - b.timestamp;
            } else if (sortBy === 'amount') {
                compareValue = a.amount - b.amount;
            }

            return sortOrder === 'asc' ? compareValue : -compareValue;
        });

        return sorted;
    }, [filteredPayments, sortBy, sortOrder]);

    // Filter update callbacks
    const updateFilter = useCallback((key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const updateDateRange = useCallback((start, end) => {
        setFilters(prev => ({
            ...prev,
            dateRange: { start, end },
        }));
    }, []);

    const updateAmountRange = useCallback((min, max) => {
        setFilters(prev => ({
            ...prev,
            amountRange: { min, max },
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            direction: 'all',
            dateRange: { start: null, end: null },
            amountRange: { min: null, max: null },
            assetCode: null,
            searchHash: '',
        });
    }, []);

    return {
        // Filtered and sorted data
        payments: sortedPayments,
        filteredCount: sortedPayments.length,

        // Filter state
        filters,
        setFilters,
        updateFilter,
        updateDateRange,
        updateAmountRange,
        resetFilters,

        // Sort state
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
    };
}

export default usePaymentFilters;
