import React from 'react';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { usePaymentAnalytics } from '../hooks/usePaymentAnalytics';
import './AnalyticsPage.css';

export default function AnalyticsPage({ payments, connectedWallet }) {
    const analytics = usePaymentAnalytics(payments, connectedWallet);

    return (
        <div className="analytics-page">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">Analytics</h1>
                <p className="page-subtitle">Detailed insights into your payment activity</p>
            </div>

            {/* Metrics */}
            <AnalyticsDashboard analytics={analytics} />

            {/* Charts Placeholder */}
            <div className="charts-section">
                <div className="chart-card glass-card">
                    <h3 className="chart-title">Transaction Volume Trends</h3>
                    <div className="chart-placeholder">
                        <p>Chart visualization coming soon</p>
                        <p className="chart-note">Integration with chart library (Recharts) planned</p>
                    </div>
                </div>

                <div className="charts-grid">
                    <div className="chart-card glass-card">
                        <h3 className="chart-title">Incoming vs Outgoing</h3>
                        <div className="chart-placeholder">
                            <p>Pie chart placeholder</p>
                        </div>
                    </div>

                    <div className="chart-card glass-card">
                        <h3 className="chart-title">Activity Heatmap</h3>
                        <div className="chart-placeholder">
                            <p>Calendar heatmap placeholder</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
