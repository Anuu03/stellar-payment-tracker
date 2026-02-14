import React from "react";
import { CONFIG } from "../config";
import { truncateAddress, formatXLM, formatTimestamp } from "../utils/errorHandler";
import "./TransactionDetails.css";

/**
 * Transaction Details Component
 * 
 * Expandable view showing full transaction metadata
 */
export default function TransactionDetails({ payment, onCopy }) {
    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        if (onCopy) onCopy();
    };

    const explorerUrl = CONFIG.STELLAR_EXPERT_URL
        ? `${CONFIG.STELLAR_EXPERT_URL}/tx/${payment.hash}`
        : `https://stellar.expert/explorer/testnet/tx/${payment.hash}`;

    return (
        <div className="transaction-details">
            <div className="details-grid">
                {/* Transaction Hash */}
                <div className="detail-row">
                    <span className="detail-label">Transaction Hash:</span>
                    <div className="detail-value hash-value">
                        <span className="hash-text" title={payment.hash}>
                            {truncateAddress(payment.hash, 8)}
                        </span>
                        <button
                            className="copy-btn"
                            onClick={() => handleCopy(payment.hash)}
                            title="Copy to clipboard"
                        >
                            📋
                        </button>
                    </div>
                </div>

                {/* Operation ID */}
                <div className="detail-row">
                    <span className="detail-label">Operation ID:</span>
                    <span className="detail-value monospace">{payment.id}</span>
                </div>

                {/* Type */}
                <div className="detail-row">
                    <span className="detail-label">Type:</span>
                    <span className="detail-value">
                        <span className="type-badge">{payment.type}</span>
                    </span>
                </div>

                {/* Asset */}
                <div className="detail-row">
                    <span className="detail-label">Asset:</span>
                    <span className="detail-value">
                        {payment.asset_code || 'XLM'} ({payment.asset_type})
                    </span>
                </div>

                {/* Ledger */}
                {payment.ledger && (
                    <div className="detail-row">
                        <span className="detail-label">Ledger:</span>
                        <span className="detail-value monospace">#{payment.ledger}</span>
                    </div>
                )}

                {/* Timestamp */}
                <div className="detail-row">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">{formatTimestamp(payment.timestamp)}</span>
                </div>

                {/* Status */}
                <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">
                        <span className={`status-badge ${payment.successful ? 'status-success' : 'status-error'}`}>
                            {payment.successful ? '✅ Successful' : '❌ Failed'}
                        </span>
                    </span>
                </div>

                {/* Memo (if exists) */}
                {payment.memo && (
                    <div className="detail-row">
                        <span className="detail-label">Memo:</span>
                        <span className="detail-value">{payment.memo}</span>
                    </div>
                )}
            </div>

            {/* Explorer Link */}
            <div className="explorer-link">
                <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    View on Stellar Expert →
                </a>
            </div>
        </div>
    );
}
