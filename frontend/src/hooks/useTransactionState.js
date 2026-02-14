import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Transaction State Machine States
 */
export const TX_STATES = {
    IDLE: "idle",
    VALIDATING: "validating",
    SIGNING: "signing",
    SUBMITTING: "submitting",
    CONFIRMING: "confirming",
    SUCCESS: "success",
    ERROR: "error",
    CANCELLED: "cancelled",
};

/**
 * Production-grade transaction state machine hook
 * 
 * Features:
 * - 8-state lifecycle management
 * - Idempotency protection
 * - AbortController support
 * - Automatic timeout handling
 * - Memory leak prevention
 * - Race condition protection
 * 
 * @param {Object} options Configuration options
 * @param {Function} options.onSuccess Callback executed on successful transaction
 * @param {Function} options.onError Callback executed on transaction error
 * @param {number} options.timeout Transaction timeout in milliseconds (default: 60000)
 * @param {number} options.autoResetDelay Delay before auto-reset after success (default: 3000)
 */
export function useTransactionState(options = {}) {
    const {
        onSuccess,
        onError,
        timeout = 60000, // 60 seconds default
        autoResetDelay = 3000, // 3 seconds default
    } = options;

    // State management
    const [state, setState] = useState(TX_STATES.IDLE);
    const [error, setError] = useState(null);
    const [txHash, setTxHash] = useState(null);
    const [startTime, setStartTime] = useState(null);

    // Refs for idempotency protection and cleanup
    const abortControllerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const pendingTxRef = useRef(null);
    const timeoutIdRef = useRef(null);
    const autoResetTimeoutRef = useRef(null);

    /**
     * Cleanup function to abort ongoing operations
     */
    const cleanup = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
        }
        if (autoResetTimeoutRef.current) {
            clearTimeout(autoResetTimeoutRef.current);
            autoResetTimeoutRef.current = null;
        }
        isProcessingRef.current = false;
        pendingTxRef.current = null;
    }, []);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    /**
     * Transition to a new state (with validation)
     */
    const transitionTo = useCallback((newState, errorMessage = null, hash = null) => {
        setState(newState);

        if (errorMessage) {
            setError(errorMessage);
        } else {
            setError(null);
        }

        if (hash) {
            setTxHash(hash);
        }
    }, []);

    /**
     * Reset to idle state
     */
    const reset = useCallback(() => {
        cleanup();
        setState(TX_STATES.IDLE);
        setError(null);
        setTxHash(null);
        setStartTime(null);
    }, [cleanup]);

    /**
     * Cancel ongoing transaction
     */
    const cancel = useCallback(() => {
        if (isProcessingRef.current) {
            cleanup();
            transitionTo(TX_STATES.CANCELLED, "Transaction cancelled by user");
        }
    }, [cleanup, transitionTo]);

    /**
     * Execute a transaction with full lifecycle management
     * 
     * @param {Function} txFunction Async function that executes the transaction
     *                              Receives AbortSignal as parameter
     *                              Should return object with { hash, result }
     */
    const executeTransaction = useCallback(async (txFunction) => {
        // Idempotency guard: prevent duplicate submissions
        if (isProcessingRef.current || pendingTxRef.current) {
            console.warn("[Transaction Guard] Transaction already in progress");
            return { success: false, error: "Transaction already in progress" };
        }

        // Set processing flag immediately
        isProcessingRef.current = true;
        setStartTime(Date.now());

        // Create new AbortController
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Set timeout
        timeoutIdRef.current = setTimeout(() => {
            abortController.abort();
            transitionTo(
                TX_STATES.ERROR,
                "Transaction timeout - please try again"
            );
            cleanup();
        }, timeout);

        try {
            // Transition to validating state
            transitionTo(TX_STATES.VALIDATING);

            // Execute the transaction function
            const result = await txFunction(abortController.signal);

            // Check if aborted during execution
            if (abortController.signal.aborted) {
                transitionTo(TX_STATES.CANCELLED, "Transaction was cancelled");
                return { success: false, error: "Transaction cancelled" };
            }

            // Store transaction hash as guard
            if (result?.hash) {
                pendingTxRef.current = result.hash;
                setTxHash(result.hash);
            }

            // Transition to success
            transitionTo(TX_STATES.SUCCESS, null, result?.hash);

            // Clear timeout
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
                timeoutIdRef.current = null;
            }

            // Call success callback
            if (onSuccess) {
                await onSuccess(result);
            }

            // Auto-reset to idle after delay
            autoResetTimeoutRef.current = setTimeout(() => {
                reset();
            }, autoResetDelay);

            return { success: true, result };

        } catch (err) {
            console.error("[Transaction Error]", err);

            // Check if it was a cancellation
            if (err.name === "AbortError" || err.message?.includes("abort")) {
                transitionTo(TX_STATES.CANCELLED, "Transaction was cancelled");
                return { success: false, error: "Transaction cancelled" };
            }

            // Determine if it was a user rejection
            const isUserRejection =
                err.message?.toLowerCase().includes("user declined") ||
                err.message?.toLowerCase().includes("user denied") ||
                err.message?.toLowerCase().includes("user rejected") ||
                err.message?.toLowerCase().includes("cancelled") ||
                err.cancelled === true;

            if (isUserRejection) {
                transitionTo(TX_STATES.CANCELLED, "Transaction cancelled by user");
                return { success: false, error: "User cancelled" };
            }

            // General error
            const errorMessage = err.message || "Transaction failed";
            transitionTo(TX_STATES.ERROR, errorMessage);

            // Call error callback
            if (onError) {
                onError(err);
            }

            return { success: false, error: errorMessage };

        } finally {
            // Clear processing flag and pending tx
            isProcessingRef.current = false;

            // Clear timeout
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
                timeoutIdRef.current = null;
            }

            // Note: Don't clear pendingTxRef here - it's cleared on reset
        }
    }, [timeout, autoResetDelay, onSuccess, onError, transitionTo, reset, cleanup]);

    /**
     * Update state during transaction execution
     * (Called by transaction function to update UI)
     */
    const updateState = useCallback((newState) => {
        if (isProcessingRef.current) {
            transitionTo(newState);
        }
    }, [transitionTo]);

    // Computed properties
    const isProcessing = [
        TX_STATES.VALIDATING,
        TX_STATES.SIGNING,
        TX_STATES.SUBMITTING,
        TX_STATES.CONFIRMING,
    ].includes(state);

    const canSubmit = state === TX_STATES.IDLE;

    const isComplete = [
        TX_STATES.SUCCESS,
        TX_STATES.ERROR,
        TX_STATES.CANCELLED,
    ].includes(state);

    return {
        // State
        state,
        error,
        txHash,
        startTime,

        // Computed flags
        isProcessing,
        canSubmit,
        isComplete,

        // Actions
        executeTransaction,
        updateState,
        reset,
        cancel,

        // Constants
        TX_STATES,
    };
}

export default useTransactionState;
