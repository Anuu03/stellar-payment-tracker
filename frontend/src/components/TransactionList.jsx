import React, { useState } from 'react';
import { truncateAddress, formatXLM, formatTimestamp } from '../utils/errorHandler';
import TransactionDetails from './TransactionDetails';
import './TransactionList.css';

/**
 * TransactionList - Pure Presentation Component
 * 
 * Renders a list of transactions with expandable details.
 * Uses inline accordion pattern (no portals, no z-index hacks).
 * 
 * @param {Array} transactions - Array of payment/transaction objects
 * @param {string} connectedWallet - Current user's wallet address
 * @param {boolean} isLoading - Loading state
 */
export default function TransactionList({ transactions = [], connectedWallet, isLoading = false }) {
    const [expandedId, setExpandedId] = useState(null);
    const [copiedHash, setCopiedHash] = useState(null);

    const toggleExpand = (txId) => {
        setExpandedId(expandedId === txId ? null : txId);
    };

    const handleCopy = (hash) => {
        setCopiedHash(hash);
        setTimeout(() => setCopiedHash(null), 2000);
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="transaction-list">
                <div className="skeleton-list">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="transaction-item skeleton" />
                    ))}
                </div>
            </div>
        );
    }

    // Empty state
    if (!transactions || transactions.length === 0) {
        return (
            <div className="transaction-list">
                <div className="empty-state">
                    <span className="empty-icon">📭</span>
                    <p className="empty-text">No transactions yet</p>
                    <p className="empty-subtext">Send your first payment to get started!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="transaction-list">
            {transactions.map((tx) => {
                const isExpanded = expandedId === tx.id;

                return (
                    <div
                        key={tx.id}
                        className={`transaction-item ${isExpanded ? 'expanded' : ''}`}
                    >
                        {/* Transaction Summary - Clickable */}
                        <div
                            className="transaction-summary"
                            onClick={() => toggleExpand(tx.id)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => e.key === 'Enter' && toggleExpand(tx.id)}
                        >
                            <div className="transaction-header">
                                {/* Direction Badge */}
                                <span className={`payment-direction ${tx.direction}`}>
                                    {tx.direction === 'sent' ? 'SENT' : 'RECEIVED'}
                                </span>

                                {/* From/To Addresses */}
                                <div className="payment-details">
                                    <div className="payment-addresses">
                                        <span className="address-label">From:</span>
                                        <span className="address" title={tx.from}>
                                            {truncateAddress(tx.from)}
                                        </span>
                                    </div>
                                    <div className="payment-addresses">
                                        <span className="address-label">To:</span>
                                        <span className="address" title={tx.to}>
                                            {truncateAddress(tx.to)}
                                        </span>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="payment-amount">
                                    <span className={`amount ${tx.direction}`}>
                                        {tx.direction === 'sent' ? '-' : '+'}
                                        {formatXLM(tx.amount)}
                                    </span>
                                    <span className="currency">
                                        {tx.asset_code || 'XLM'}
                                    </span>
                                </div>

                                {/* Status Badge */}
                                <div className="payment-status">
                                    <span className={`status-badge ${tx.successful ? 'success' : 'failed'}`}>
                                        {tx.successful ? '✓' : '✗'}
                                    </span>
                                </div>

                                {/* Expand Icon */}
                                <div className="expand-icon">
                                    <span className={`chevron ${isExpanded ? 'expanded' : ''}`}>
                                        ▼
                                    </span>
                                </div>
                            </div>

                            {/* Timestamp */}
                            <div className="transaction-footer">
                                <span className="payment-timestamp">
                                    {formatTimestamp(tx.timestamp)}
                                </span>
                                {copiedHash === tx.hash && (
                                    <span className="copy-feedback">Copied! ✓</span>
                                )}
                            </div>
                        </div>

                        {/* Expandable Details - Inline Accordion */}
                        <div className={`transaction-details-wrapper ${isExpanded ? 'expanded' : ''}`}>
                            {isExpanded && (
                                <TransactionDetails
                                    payment={tx}
                                    onCopy={() => handleCopy(tx.hash)}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
