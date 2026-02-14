import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider, useWallet } from "./contexts/WalletContext";
import WalletSelector from "./components/WalletSelector";
import TransactionStatus from "./components/TransactionStatus";
import AppLayout from "./components/layout/AppLayout";
import PaymentDrawer from "./components/PaymentDrawer";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import { CONFIG } from "./config";
import {
  buildPaymentTransaction,
  submitPaymentTransaction,
  prepareContractTransaction,
  submitContractTransaction,
  pollTransactionStatus,
} from "./services/transactionService";
import useTransactionState, { TX_STATES } from "./hooks/useTransactionState";
import { useWalletScopedData } from "./hooks/useWalletScopedData";
import "./App.css";

function AppContent() {
  const { address, isConnected, signTransaction, refreshBalance, balance } = useWallet();

  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);

  // WALLET-SCOPED DATA (auto-managed lifecycle)
  const {
    transactions: payments,
    analytics,
    isLoading: isLoadingPayments,
    error: paymentsError,
    refetch: refetchPayments
  } = useWalletScopedData(address);

  // Transaction state machine
  const {
    state: transactionState,
    error: transactionError,
    txHash: transactionHash,
    startTime: transactionStartTime,
    isProcessing,
    canSubmit,
    executeTransaction,
    updateState,
    reset: resetTransaction,
  } = useTransactionState({
    onSuccess: async () => {
      // Refresh balance and payments after successful transaction
      await Promise.all([refreshBalance(), refetchPayments()]);
      // Close payment drawer on success
      setShowPaymentDrawer(false);
    },
    timeout: 60000, // 60 seconds
    autoResetDelay: 3000, // Auto-reset after 3 seconds
  });

  // NOTE: Payment data is now automatically managed by useWalletScopedData hook
  // - Fetches when address changes
  // - Clears when wallet disconnects
  // - Caches per wallet
  // - Aborts pending requests on wallet switch

  const handlePayment = async ({ receiver, amount }) => {
    await executeTransaction(async (abortSignal) => {
      try {
        // Step 1: Build and submit XLM payment
        updateState(TX_STATES.SIGNING);
        const paymentXdr = await buildPaymentTransaction(address, receiver, amount);

        // Check if aborted
        if (abortSignal.aborted) {
          throw new Error("Transaction aborted");
        }

        const signedPaymentXdr = await signTransaction(paymentXdr);

        // Check if aborted after signature
        if (abortSignal.aborted) {
          throw new Error("Transaction aborted");
        }

        updateState(TX_STATES.SUBMITTING);
        const paymentResult = await submitPaymentTransaction(signedPaymentXdr);

        console.log("Payment successful:", paymentResult);

        // Step 2: Log to contract
        updateState(TX_STATES.SIGNING);
        const contractTx = await prepareContractTransaction(address, receiver, amount);

        // Check if aborted
        if (abortSignal.aborted) {
          throw new Error("Transaction aborted");
        }

        const signedContractXdr = await signTransaction(contractTx.xdr);

        // Check if aborted after signature
        if (abortSignal.aborted) {
          throw new Error("Transaction aborted");
        }

        updateState(TX_STATES.SUBMITTING);
        const submitResult = await submitContractTransaction(signedContractXdr);

        console.log("Contract transaction submitted:", submitResult);

        // Step 3: Poll for confirmation
        updateState(TX_STATES.CONFIRMING);
        const pollResult = await pollTransactionStatus(
          submitResult.hash,
          abortSignal
        );

        if (pollResult.success) {
          return { hash: submitResult.hash, result: pollResult };
        } else {
          throw new Error(pollResult.error || "Transaction failed");
        }
      } catch (error) {
        // Re-throw to let state machine handle it
        throw error;
      }
    });
  };

  // If not connected, show connect screen
  if (!isConnected) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="logo">
              <span className="logo-icon">⭐</span>
              <h1>Stellar Payment Tracker</h1>
            </div>
            <div className="header-info">
              <span className="badge badge-info">
                Contract: {CONFIG.CONTRACT_ID.slice(0, 8)}...
              </span>
            </div>
          </div>
        </header>

        <main className="app-main">
          <div className="connect-container">
            <div className="hero glass-card">
              <h2 className="hero-title">Welcome to Stellar Payment Tracker</h2>
              <p className="hero-subtitle">
                A production-grade Soroban DApp for tracking XLM payments on-chain
              </p>
              <div className="features">
                <div className="feature">
                  <span className="feature-icon">🔐</span>
                  <span>Multi-Wallet Support</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">⚡</span>
                  <span>Real-Time Updates</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">📊</span>
                  <span>On-Chain Storage</span>
                </div>
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setShowWalletSelector(true)}
              >
                <span>🚀</span>
                Connect Wallet
              </button>
            </div>
          </div>
        </main>

        <WalletSelector
          isOpen={showWalletSelector}
          onClose={() => setShowWalletSelector(false)}
        />
      </div>
    );
  }

  // When connected, show multi-page dashboard with routing
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AppLayout
              address={address}
              balance={balance}
              onNewPayment={() => setShowPaymentDrawer(true)}
            />
          }
        >
          <Route
            index
            element={
              <DashboardPage
                payments={payments}
                connectedWallet={address}
                isLoading={isLoadingPayments}
              />
            }
          />
          <Route
            path="transactions"
            element={
              <TransactionsPage
                payments={payments}
                connectedWallet={address}
                isLoading={isLoadingPayments}
              />
            }
          />
          <Route
            path="analytics"
            element={
              <AnalyticsPage
                payments={payments}
                connectedWallet={address}
              />
            }
          />
          <Route
            path="settings"
            element={
              <SettingsPage
                onDisconnect={() => {
                  // Clear wallet data and show wallet selector
                  window.location.reload(); // Simple approach to reset state
                }}
                onReconnect={() => setShowWalletSelector(true)}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {/* Payment Drawer */}
      <PaymentDrawer
        isOpen={showPaymentDrawer}
        onClose={() => setShowPaymentDrawer(false)}
        onSubmit={handlePayment}
        isLoading={isProcessing}
      />

      {/* Transaction Status (floating) */}
      {transactionState !== 'idle' && (
        <div className="floating-status">
          <TransactionStatus
            status={transactionState}
            hash={transactionHash}
            error={transactionError}
            startTime={transactionStartTime}
          />
        </div>
      )}
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
