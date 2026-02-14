import React, { useState } from "react";
import { isValidStellarAddress } from "../utils/errorHandler";
import "./PaymentForm.css";

export default function PaymentForm({ onSubmit, isLoading }) {
    const [receiver, setReceiver] = useState("");
    const [amount, setAmount] = useState("");
    const [errors, setErrors] = useState({});

    const validate = () => {
        const newErrors = {};

        if (!receiver) {
            newErrors.receiver = "Receiver address is required";
        } else if (!isValidStellarAddress(receiver)) {
            newErrors.receiver = "Invalid Stellar address";
        }

        if (!amount) {
            newErrors.amount = "Amount is required";
        } else if (parseFloat(amount) <= 0) {
            newErrors.amount = "Amount must be greater than 0";
        } else if (parseFloat(amount) > 1000000) {
            newErrors.amount = "Amount too large";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validate()) {
            onSubmit({ receiver, amount });
        }
    };

    return (
        <form className="payment-form glass-card" onSubmit={handleSubmit}>
            <h2 className="form-title">Send Payment</h2>

            <div className="form-group">
                <label htmlFor="receiver">Receiver Address</label>
                <input
                    id="receiver"
                    type="text"
                    className={`input ${errors.receiver ? "error" : ""}`}
                    placeholder="GXXX...XXXX"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    disabled={isLoading}
                />
                {errors.receiver && <span className="error-message">{errors.receiver}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="amount">Amount (XLM)</label>
                <input
                    id="amount"
                    type="number"
                    step="0.01"
                    className={`input ${errors.amount ? "error" : ""}`}
                    placeholder="10.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isLoading}
                />
                {errors.amount && <span className="error-message">{errors.amount}</span>}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <span className="spin">⏳</span>
                        Processing...
                    </>
                ) : (
                    <>
                        <span>💸</span>
                        Send Payment
                    </>
                )}
            </button>
        </form>
    );
}
