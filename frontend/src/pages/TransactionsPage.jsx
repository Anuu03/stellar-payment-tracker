import React from 'react';
import TransactionList from '../components/TransactionList';
import FilterBar from '../components/FilterBar';
import { usePaymentFilters } from '../hooks/usePaymentFilters';
import './TransactionsPage.css';

export default function TransactionsPage({ payments, connectedWallet, isLoading }) {
    const {
        payments: filteredPayments,
        filteredCount,
        filters,
        updateFilter,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
    } = usePaymentFilters(payments);

    const handleSortChange = (by, order) => {
        setSortBy(by);
        setSortOrder(order);
    };

    return (
        <div className="transactions-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Transactions</h1>
                    <p className="page-subtitle">Complete transaction history and filtering</p>
                </div>
                <button className="btn btn-secondary export-btn">
                    Export CSV
                </button>
            </div>

            {/* Single FilterBar - No duplicates */}
            <FilterBar
                filters={filters}
                onFilterChange={updateFilter}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
                filteredCount={filteredCount}
                totalCount={payments.length}
            />

            {/* Transaction List - Pure presentation */}
            <TransactionList
                transactions={filteredPayments}
                connectedWallet={connectedWallet}
                isLoading={isLoading}
            />
        </div>
    );
}
