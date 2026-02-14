import React from "react";
import { CONFIG } from "../config";
import "./TransactionStatus.css";

const STATUS_CONFIG = {
    idle: { icon: "⚪", label: "Ready", color: "secondary" },
    validating: { icon: "🔍", label: "Validating payment...", color: "info", animated: true },
    signing: { icon: "✍️", label: "Awaiting Wallet Signature...", color: "warning", animated: true },
    submitting: { icon: "📡", label: "Submitting to Network...", color: "info", animated: true },
    confirming: { icon: "⏱️", label: "Confirming on Chain...", color: "warning", animated: true },
    success: { icon: "✅", label: "Payment Successful!", color: "success" },
    error: { icon: "❌", label: "Transaction Failed", color: "error" },
    cancelled: { icon: "🚫", label: "Transaction Cancelled", color: "secondary" },
};

export default function TransactionStatus({ status, hash, error, startTime }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

    const getElapsedTime = () => {
        if (!startTime) return null;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        return `${elapsed}s`;
    };

    if (status === "idle") return null;

    return (
        <div className={`transaction-status glass-card status-${config.color}`}>
            <div className="status-header">
                <span className={`status-icon ${config.animated ? "pulse" : ""}`}>
                    {config.icon}
                </span>
                <div className="status-details">
                    <h3 className="status-label">{config.label}</h3>
                    {hash && (
                        <a
                            href={`${CONFIG.STELLAR_EXPERT_URL}/tx/${hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tx-hash"
                        >
                            View on Explorer →
                        </a>
                    )}
                </div>
                {startTime && (
                    <span className="elapsed-time">{getElapsedTime()}</span>
                )}
            </div>

            {status === "confirming" && (
                <div className="progress-bar">
                    <div className="progress-fill"></div>
                </div>
            )}

            {error && (
                <div className="error-details">
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
}
