import React, { useState, useEffect } from 'react';
import PaymentForm from './PaymentForm';
import './PaymentDrawer.css';

export default function PaymentDrawer({ isOpen, onClose, onSubmit, isLoading }) {
    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div className="drawer-overlay" onClick={onClose}></div>

            {/* Drawer */}
            <div className={`payment-drawer ${isOpen ? 'open' : ''}`}>
                <div className="drawer-header">
                    <h2 className="drawer-title">Send Payment</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <div className="drawer-content">
                    <PaymentForm onSubmit={onSubmit} isLoading={isLoading} />
                </div>
            </div>
        </>
    );
}
