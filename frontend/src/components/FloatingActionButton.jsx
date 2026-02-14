import React from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import './FloatingActionButton.css';

export default function FloatingActionButton({ onClick, label = 'Send Payment' }) {
    const isMobile = useIsMobile();

    // Only show on mobile
    if (!isMobile) {
        return null;
    }

    return (
        <button
            className="fab"
            onClick={onClick}
            aria-label={label}
            title={label}
        >
            <span className="fab-icon">+</span>
        </button>
    );
}
