import React from "react";
import AnalyticsDashboard from "./AnalyticsDashboard";
import TransactionList from "./TransactionList";
import { usePaymentAnalytics } from "../hooks/usePaymentAnalytics";
import "./ActivityFeed.css";

/**
 * ActivityFeed - Dashboard Widget Component
 * 
 * Displays analytics dashboard and transaction list.
 * Used on the Dashboard page for showing recent activity.
 * 
 * Does NOT include filters - those are rendered by parent page when needed.
 * 
 * @param {Array} payments - Array of payment transactions
 * @param {string} connectedWallet - Current user's wallet address
 * @param {boolean} isLoading - Loading state
 * @param {boolean} showAnalytics - Whether to show analytics dashboard (default: true)
 */
export default function ActivityFeed({
    payments,
    isLoading,
    connectedWallet,
    showAnalytics = true
}) {
    // Analytics calculations (for dashboard display)
    const analytics = usePaymentAnalytics(payments, connectedWallet);

    return (
        <div className="activity-feed">
            {/* Feed Header */}
            <div className="feed-header">
                <h2 className="feed-title">Recent Activity</h2>
                {payments && payments.length > 0 && (
                    <span className="badge badge-info">{payments.length} total</span>
                )}
            </div>

            {/* Analytics Dashboard - Optional */}
            {showAnalytics && payments && payments.length > 0 && (
                <AnalyticsDashboard analytics={analytics} />
            )}

            {/* Transaction List - Delegated to TransactionList component */}
            <TransactionList
                transactions={payments}
                connectedWallet={connectedWallet}
                isLoading={isLoading}
            />
        </div>
    );
}
