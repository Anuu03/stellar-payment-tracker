import { createContext, useContext, useState, useEffect, useRef } from "react";
import {
    StellarWalletsKit,
    WalletNetwork,
    FREIGHTER_ID,
    XBULL_ID,
    ALBEDO_ID,
    allowAllModules,
} from "@creit.tech/stellar-wallets-kit";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
    const walletKitRef = useRef(null);

    const getWalletKit = () => {
        if (!walletKitRef.current) {
            walletKitRef.current = new StellarWalletsKit({
                network: WalletNetwork.TESTNET,
                selectedWalletId: FREIGHTER_ID,
                modules: allowAllModules(),
            });
        }
        return walletKitRef.current;
    };

    const [address, setAddress] = useState(null);
    const [walletType, setWalletType] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [balance, setBalance] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // ================= CHECK EXISTING CONNECTION =================
    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            // Check if user explicitly disconnected
            const wasDisconnected = localStorage.getItem('wallet_disconnected');
            if (wasDisconnected === 'true') {
                console.log('[WalletContext] User explicitly disconnected, skipping auto-connect');
                return;
            }

            const kit = getWalletKit();
            const { address: publicKey } = await kit.getAddress();
            if (publicKey) {
                setAddress(publicKey);
                setIsConnected(true);
                fetchBalance(publicKey);
            }
        } catch {
            console.log("Not connected");
        }
    };

    // ================= FETCH BALANCE =================
    const fetchBalance = async (walletAddress = address) => {
        if (!walletAddress) return;

        try {
            const response = await fetch(`${HORIZON_URL}/accounts/${walletAddress}`);

            if (!response.ok) {
                console.warn("Account not found on Horizon");
                setBalance(0);
                return;
            }

            const data = await response.json();

            if (!data || !Array.isArray(data.balances)) {
                console.warn("Invalid Horizon response");
                setBalance(0);
                return;
            }

            const xlmBalance = data.balances.find(
                (b) => b.asset_type === "native"
            );

            setBalance(xlmBalance ? parseFloat(xlmBalance.balance) : 0);
        } catch (err) {
            console.error("Failed to fetch balance:", err);
            setBalance(0);
        }
    };

    // ================= CONNECT WALLET =================
    const connectWallet = async (selectedWalletId = FREIGHTER_ID) => {
        setIsLoading(true);
        setError(null);

        try {
            const kit = getWalletKit();

            kit.setWallet(selectedWalletId);

            const { address: publicKey } = await kit.getAddress();

            if (!publicKey) throw new Error("No public key returned");

            // Clear disconnect flag since user is explicitly connecting
            localStorage.removeItem('wallet_disconnected');

            setAddress(publicKey);
            setWalletType(selectedWalletId);
            setIsConnected(true);

            await fetchBalance(publicKey);

            setIsLoading(false);
            return publicKey;
        } catch (err) {
            console.error("Wallet connection error:", err);

            let errorMessage = "Failed to connect wallet";

            if (
                err.message?.includes("User declined") ||
                err.message?.includes("denied")
            ) {
                errorMessage = "Connection cancelled by user";
            }

            setError(errorMessage);
            setIsLoading(false);
            throw new Error(errorMessage);
        }
    };

    // ================= DISCONNECT =================
    const disconnectWallet = () => {
        console.log('[WalletContext] Disconnecting wallet');

        // Set flag to prevent auto-reconnect on page reload
        localStorage.setItem('wallet_disconnected', 'true');

        // Clear wallet state
        setAddress(null);
        setWalletType(null);
        setIsConnected(false);
        setBalance(null);
        setError(null);
    };

    // ================= SIGN TRANSACTION =================
    const signTransaction = async (xdr) => {
        if (!isConnected) {
            throw new Error("Wallet not connected");
        }

        try {
            const kit = getWalletKit();

            const { signedTxXdr } = await kit.signTransaction(xdr, {
                networkPassphrase: NETWORK_PASSPHRASE,
            });

            return signedTxXdr;
        } catch (err) {
            console.error("Transaction signing error:", err);

            // Detect user rejection/cancellation
            const isUserRejection =
                err.message?.toLowerCase().includes("user declined") ||
                err.message?.toLowerCase().includes("user denied") ||
                err.message?.toLowerCase().includes("user rejected") ||
                err.message?.toLowerCase().includes("user cancelled") ||
                err.message?.toLowerCase().includes("cancelled") ||
                err.message?.toLowerCase().includes("rejected");

            // Create structured error for better handling
            const error = new Error(
                isUserRejection
                    ? "User cancelled transaction"
                    : err.message || "Failed to sign transaction"
            );
            error.cancelled = isUserRejection;
            error.originalError = err;

            throw error;
        }
    };

    const value = {
        address,
        walletType,
        isConnected,
        balance,
        isLoading,
        error,
        connectWallet,
        disconnectWallet,
        signTransaction,
        refreshBalance: fetchBalance,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error("useWallet must be used within WalletProvider");
    }
    return context;
};

export { FREIGHTER_ID, XBULL_ID, ALBEDO_ID };
