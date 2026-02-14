#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Vec, panic_with_error,
};

/// Payment Tracker Contract
/// Logs payments and provides queryable payment history
#[contract]
pub struct PaymentTracker;

/// Payment record structure
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Payment {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub timestamp: u64,
}

/// Error codes
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    PaymentNotFound = 1,
    InvalidRange = 2,
}

const COUNT_KEY: &str = "COUNT";

#[contractimpl]
impl PaymentTracker {
    
    /// Log a new payment to the blockchain
    /// Emits an event with payment details including ID and timestamp
    pub fn log_payment(env: Env, from: Address, to: Address, amount: i128) {
        // Require sender authorization
        from.require_auth();

        // Get current payment count
        let mut count: u32 = env.storage()
            .persistent()
            .get(&symbol_short!(COUNT_KEY))
            .unwrap_or(0);

        count += 1;

        let timestamp = env.ledger().timestamp();

        // Create payment record
        let payment = Payment {
            from: from.clone(),
            to: to.clone(),
            amount,
            timestamp,
        };

        // Store payment with persistent storage for production
        env.storage()
            .persistent()
            .set(&count, &payment);

        // Update total count
        env.storage()
            .persistent()
            .set(&symbol_short!(COUNT_KEY), &count);

        // Emit enhanced event with payment ID and timestamp
        env.events().publish(
            (symbol_short!("payment"),),
            (count, from, to, amount, timestamp)
        );
    }

    /// Get total number of logged payments
    pub fn get_total(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&symbol_short!(COUNT_KEY))
            .unwrap_or(0)
    }

    /// Get a single payment by ID
    /// Returns Payment or panics if not found
    pub fn get_payment(env: Env, id: u32) -> Payment {
        env.storage()
            .persistent()
            .get(&id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::PaymentNotFound))
    }

    /// Get a range of payments for pagination
    /// start: starting payment ID (1-indexed)
    /// limit: maximum number of payments to return
    pub fn get_payments_range(env: Env, start: u32, limit: u32) -> Vec<Payment> {
        if limit == 0 || limit > 100 {
            panic_with_error!(&env, Error::InvalidRange);
        }

        let total = Self::get_total(env.clone());
        let mut payments: Vec<Payment> = Vec::new(&env);

        if start > total || start == 0 {
            return payments;
        }

        let end = if start + limit - 1 > total {
            total
        } else {
            start + limit - 1
        };

        for i in start..=end {
            if let Some(payment) = env.storage().persistent().get::<u32, Payment>(&i) {
                payments.push_back(payment);
            }
        }

        payments
    }

    /// Get the most recent payments
    /// limit: maximum number of recent payments to return (max 100)
    pub fn get_recent_payments(env: Env, limit: u32) -> Vec<Payment> {
        if limit == 0 || limit > 100 {
            panic_with_error!(&env, Error::InvalidRange);
        }

        let total = Self::get_total(env.clone());
        let mut payments: Vec<Payment> = Vec::new(&env);

        if total == 0 {
            return payments;
        }

        let start = if total > limit {
            total - limit + 1
        } else {
            1
        };

        for i in (start..=total).rev() {
            if let Some(payment) = env.storage().persistent().get::<u32, Payment>(&i) {
                payments.push_back(payment);
            }
        }

        payments
    }
}
