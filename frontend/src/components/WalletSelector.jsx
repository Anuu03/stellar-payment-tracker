import React from "react";
import { useWallet, FREIGHTER_ID, XBULL_ID, ALBEDO_ID } from "../contexts/WalletContext";
import "./WalletSelector.css";

const WALLETS = [
    {
        id: FREIGHTER_ID,
        name: "Freighter",
        icon: "🦅",
        description: "Browser extension",
    },
    {
        id: XBULL_ID,
        name: "xBull",
        icon: "🐂",
        description: "Browser extension",
    },
    {
        id: ALBEDO_ID,
        name: "Albedo",
        icon: "✨",
        description: "Web wallet",
    },
];

export default function WalletSelector({ isOpen, onClose }) {
    const { connectWallet, isLoading } = useWallet();

    const handleConnect = async (walletType) => {
        try {
            await connectWallet(walletType);
            onClose();
        } catch (error) {
            // Error is handled in context
            console.error("Connection failed:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Connect Wallet</h2>
                    <button className="close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="wallet-list">
                    {WALLETS.map((wallet) => (
                        <button
                            key={wallet.id}
                            className="wallet-option glass-card"
                            onClick={() => handleConnect(wallet.id)}
                            disabled={isLoading}
                        >
                            <span className="wallet-icon">{wallet.icon}</span>
                            <div className="wallet-info">
                                <h3>{wallet.name}</h3>
                                <p>{wallet.description}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <p className="modal-footer">
                    Select your preferred Stellar wallet to continue
                </p>
            </div>
        </div>
    );
}
