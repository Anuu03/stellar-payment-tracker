import React from "react";
import { useWallet } from "../contexts/WalletContext";
import { truncateAddress, formatXLM } from "../utils/errorHandler";
import "./WalletInfo.css";

export default function WalletInfo() {
    const { address, balance, disconnectWallet } = useWallet();

    const copyAddress = () => {
        navigator.clipboard.writeText(address);
        // Could add toast notification here
    };

    return (
        <div className="wallet-info-card glass-card">
            <div className="wallet-header">
                <div className="wallet-icon-badge">🔐</div>
                <div className="wallet-details">
                    <div className="wallet-address-row">
                        <span className="wallet-address" title={address}>
                            {truncateAddress(address, 6, 6)}
                        </span>
                        <button className="copy-btn" onClick={copyAddress} title="Copy address">
                            📋
                        </button>
                    </div>
                    <div className="wallet-network">
                        <span className="badge badge-info">Testnet</span>
                    </div>
                </div>
            </div>

            <div className="wallet-balance">
                <span className="balance-label">Balance</span>
                <span className="balance-amount">
                    {balance !== null ? `${formatXLM(balance)} XLM` : "Loading..."}
                </span>
            </div>

            <button className="btn btn-secondary w-full" onClick={disconnectWallet}>
                Disconnect
            </button>
        </div>
    );
}
