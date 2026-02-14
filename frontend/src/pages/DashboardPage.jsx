import React from 'react';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { usePaymentAnalytics } from '../hooks/usePaymentAnalytics';
import { formatXLM, formatTimestamp } from '../utils/errorHandler';
import './DashboardPage.css';

export default function DashboardPage({ payments, connectedWallet, isLoading }) {
    const analytics = usePaymentAnalytics(payments, connectedWallet);

    // Get recent 5 transactions
    const recentTransactions = payments.slice(0, 5);

    return (
        <div className="dashboard-page">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview of your payment activity</p>
            </div>

            {/* Analytics Metrics */}
            <AnalyticsDashboard analytics={analytics} />

            {/* Recent Transactions */}
            <div className="recent-section">
                <div className="section-header">
                    <h2 className="section-title">Recent Transactions</h2>
                    <a href="/transactions" className="view-all-link">
                        View All →
                    </a>
                </div>

                {isLoading ? (
                    <div className="skeleton-list">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="skeleton-item glass-card"></div>
                        ))}
                    </div>
                ) : recentTransactions.length === 0 ? (
                    <div className="empty-state glass-card">
                        <p className="empty-text">No transactions yet</p>
                        <p className="empty-subtext">Send your first payment to get started!</p>
                    </div>
                ) : (
                    <div className="recent-list">
                        {recentTransactions.map((tx) => (
                            <div key={tx.id} className="recent-item glass-card">
                                <div className="tx-direction">
                                    <span className={`direction-badge ${tx.direction}`}>
                                        {tx.direction === 'sent' ? 'SENT' : 'RECEIVED'}
                                    </span>
                                </div>
                                <div className="tx-info">
                                    <span className="tx-counterparty">
                                        {tx.direction === 'sent' ? 'To' : 'From'}: {tx.from || tx.to}
                                    </span>
                                    <span className="tx-time">{formatTimestamp(tx.created_at)}</span>
                                </div>
                                <div className="tx-amount">
                                    <span className={`amount ${tx.direction}`}>
                                        {tx.direction === 'sent' ? '-' : '+'}{formatXLM(tx.amount)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
