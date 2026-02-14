import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import FloatingActionButton from '../FloatingActionButton';
import { useIsMobile } from '../../hooks/useMediaQuery';
import './AppLayout.css';

export default function AppLayout({ address, balance, onNewPayment }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isMobile = useIsMobile();

    const handleMobileMenuToggle = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const handleMobileMenuClose = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="app-layout">
            {/* Mobile overlay backdrop */}
            {isMobile && isMobileMenuOpen && (
                <div
                    className="mobile-overlay"
                    onClick={handleMobileMenuClose}
                />
            )}

            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={handleMobileMenuClose}
            />

            <div className="app-content">
                <TopBar
                    address={address}
                    balance={balance}
                    onNewPayment={onNewPayment}
                    onMenuToggle={handleMobileMenuToggle}
                />

                <main className="page-content">
                    <Outlet />
                </main>
            </div>

            {/* Floating Action Button - Mobile Only */}
            <FloatingActionButton onClick={onNewPayment} />
        </div>
    );
}
