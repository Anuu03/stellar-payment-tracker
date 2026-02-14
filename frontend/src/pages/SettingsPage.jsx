import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { truncateAddress, formatXLM } from '../utils/errorHandler';
import { CONFIG } from '../config';
import './SettingsPage.css';

export default function SettingsPage({ onDisconnect, onReconnect }) {
    const { address, balance, walletType, publicKey, disconnectWallet } = useWallet();

    const handleDisconnect = async () => {
        if (window.confirm('Are you sure you want to disconnect your wallet?')) {
            try {
                // Call wallet context disconnect (sets the flag)
                await disconnectWallet();

                // DON'T clear localStorage - it contains the disconnect flag!
                // localStorage.clear(); // REMOVED - would wipe out disconnect flag

                // Call parent handler to navigate to home
                if (onDisconnect) {
                    onDisconnect();
                }
            } catch (error) {
                console.error('Disconnect error:', error);
                // Force navigation even if disconnect fails
                if (onDisconnect) {
                    onDisconnect();
                }
            }
        }
    };

    const handleReconnect = async () => {
        if (window.confirm('Switch to a different wallet? Your current wallet will be disconnected.')) {
            try {
                // Disconnect current wallet (sets the flag)
                await disconnectWallet();

                // DON'T clear localStorage - it contains the disconnect flag!
                // localStorage.clear(); // REMOVED - would wipe out disconnect flag

                // Call parent handler to show wallet selector
                if (onReconnect) {
                    onReconnect();
                }
            } catch (error) {
                console.error('Switch wallet error:', error);
                // Force navigation even if disconnect fails
                if (onReconnect) {
                    onReconnect();
                }
            }
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        alert(`${label} copied to clipboard!`);
    };

    return (
        <div className="settings-page">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage your wallet and application preferences</p>
            </div>

            {/* Wallet Information Section */}
            <section className="settings-section">
                <h2 className="section-title">Wallet Information</h2>

                <div className="info-card glass-card">
                    <div className="info-row">
                        <div className="info-label">Connected Address</div>
                        <div className="info-value">
                            <span className="monospace">{address}</span>
                            <button
                                className="copy-btn"
                                onClick={() => copyToClipboard(address, 'Address')}
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="info-label">Public Key</div>
                        <div className="info-value">
                            <span className="monospace">{publicKey || address}</span>
                            <button
                                className="copy-btn"
                                onClick={() => copyToClipboard(publicKey || address, 'Public Key')}
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="info-label">Balance</div>
                        <div className="info-value">
                            <span className="monospace balance-amount">{formatXLM(balance)}</span>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="info-label">Wallet Type</div>
                        <div className="info-value">
                            <span className="wallet-badge">{walletType || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Network Information Section */}
            <section className="settings-section">
                <h2 className="section-title">Network Information</h2>

                <div className="info-card glass-card">
                    <div className="info-row">
                        <div className="info-label">Network</div>
                        <div className="info-value">
                            <span className="network-badge">
                                <span className="network-dot"></span>
                                Testnet
                            </span>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="info-label">Horizon URL</div>
                        <div className="info-value">
                            <span className="monospace small">{CONFIG.HORIZON_URL}</span>
                        </div>
                    </div>

                    <div className="info-row">
                        <div className="info-label">Contract ID</div>
                        <div className="info-value">
                            <span className="monospace small">{CONFIG.CONTRACT_ID}</span>
                            <button
                                className="copy-btn"
                                onClick={() => copyToClipboard(CONFIG.CONTRACT_ID, 'Contract ID')}
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Wallet Actions Section */}
            <section className="settings-section">
                <h2 className="section-title">Wallet Actions</h2>

                <div className="actions-card glass-card">
                    <div className="action-item">
                        <div className="action-info">
                            <h3 className="action-title">Switch Wallet</h3>
                            <p className="action-description">
                                Connect to a different wallet or account
                            </p>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={handleReconnect}
                        >
                            Switch Wallet
                        </button>
                    </div>

                    <div className="action-item">
                        <div className="action-info">
                            <h3 className="action-title">Disconnect Wallet</h3>
                            <p className="action-description">
                                Sign out and disconnect your current wallet
                            </p>
                        </div>
                        <button
                            className="btn btn-danger"
                            onClick={handleDisconnect}
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            </section>

            {/* Application Info Section */}
            <section className="settings-section">
                <h2 className="section-title">Application Information</h2>

                <div className="info-card glass-card">
                    <div className="info-row">
                        <div className="info-label">App Name</div>
                        <div className="info-value">Stellar Payment Tracker</div>
                    </div>

                    <div className="info-row">
                        <div className="info-label">Version</div>
                        <div className="info-value">1.0.0</div>
                    </div>

                    <div className="info-row">
                        <div className="info-label">Blockchain</div>
                        <div className="info-value">Stellar (Soroban)</div>
                    </div>
                </div>
            </section>
        </div>
    );
}
