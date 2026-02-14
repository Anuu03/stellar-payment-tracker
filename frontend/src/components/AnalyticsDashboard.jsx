import React from "react";
import { formatXLM } from "../utils/errorHandler";
import "./AnalyticsDashboard.css";

/**
 * Analytics Dashboard Component
 * 
 * Displays key payment metrics in a grid of cards
 */
export default function AnalyticsDashboard({ analytics }) {
    if (!analytics) return null;

    const {
        totalSent,
        totalReceived,
        netFlow,
        transactionCount,
        avgTransaction,
        largestTransaction,
    } = analytics;

    const cards = [
        {
            label: "Total Sent",
            value: formatXLM(totalSent),
            trend: "↗",
            color: "neutral",
        },
        {
            label: "Total Received",
            value: formatXLM(totalReceived),
            trend: "↗",
            color: "success",
        },
        {
            label: "Net Flow",
            value: formatXLM(netFlow),
            trend: netFlow >= 0 ? "↗" : "↘",
            color: netFlow >= 0 ? "success" : "neutral",
        },
        {
            label: "Transactions",
            value: transactionCount,
            trend: null,
            color: "neutral",
        },
        {
            label: "Average",
            value: formatXLM(avgTransaction),
            trend: null,
            color: "neutral",
        },
        {
            label: "Largest",
            value: formatXLM(largestTransaction),
            trend: null,
            color: "neutral",
        },
    ];

    return (
        <div className="analytics-dashboard">
            <div className="analytics-grid">
                {cards.map((card, index) => (
                    <div key={index} className={`analytics-card glass-card metric-${card.color}`}>
                        <div className="card-header">
                            <span className="card-label">{card.label}</span>
                            {card.trend && <span className="card-trend">{card.trend}</span>}
                        </div>
                        <div className="card-value">{card.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
