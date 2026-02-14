import React, { useState } from 'react';
import { truncateAddress, formatXLM } from '../../utils/errorHandler';
import { useIsMobile } from '../../hooks/useMediaQuery';
import './TopBar.css';

export default function TopBar({ address, balance, onNewPayment, onMenuToggle }) {
    const isMobile = useIsMobile();

    return (
        <header className="topbar">
            <div className="topbar-left">
                {/* Hamburger Menu - Mobile Only */}
                {isMobile && (
                    <button
                        className="hamburger-btn"
                        onClick={onMenuToggle}
                        aria-label="Open menu"
                    >
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                    </button>
                )}

                {/* Network Badge */}
                <div className="network-badge">
                    <span className="network-dot"></span>
                    <span className="network-label">Testnet</span>
                </div>

                {/* Balance Display - Hidden on Mobile */}
                {balance !== null && (
                    <div className="balance-display">
                        <span className="balance-label">Balance</span>
                        <span className="balance-value">{formatXLM(balance)}</span>
                    </div>
                )}
            </div>

            <div className="topbar-right">
                {/* New Payment Button - Hide text on mobile */}
                <button className="btn btn-primary new-payment-btn" onClick={onNewPayment}>
                    <span>+</span>
                    <span className="hide-mobile">New Payment</span>
                </button>

                {/* User Address */}
                {address && (
                    <div className="user-address">
                        <span className="address-icon">👤</span>
                        <span className="address-text">{truncateAddress(address)}</span>
                    </div>
                )}
            </div>
        </header>
    );
}
