#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{Env, Address, testutils::Address as _};

#[test]
fn test_log_payment() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentTracker);
    let client = PaymentTrackerClient::new(&env, &contract_id);

    let from = Address::generate(&env);
    let to = Address::generate(&env);
    let amount: i128 = 1000;

    client.log_payment(&from, &to, &amount);

    let total = client.get_total();
    assert_eq!(total, 1);

    let payment = client.get_payment(&1);
    assert_eq!(payment.from, from);
    assert_eq!(payment.to, to);
    assert_eq!(payment.amount, amount);
}

#[test]
fn test_multiple_payments() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentTracker);
    let client = PaymentTrackerClient::new(&env, &contract_id);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // Log 5 payments
    for i in 1..=5 {
        client.log_payment(&from, &to, &(i * 100));
    }

    let total = client.get_total();
    assert_eq!(total, 5);
}

#[test]
fn test_get_payments_range() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentTracker);
    let client = PaymentTrackerClient::new(&env, &contract_id);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // Log 10 payments
    for i in 1..=10 {
        client.log_payment(&from, &to, &(i * 100));
    }

    // Get payments 3-7
    let payments = client.get_payments_range(&3, &5);
    assert_eq!(payments.len(), 5);
    assert_eq!(payments.get(0).unwrap().amount, 300);
    assert_eq!(payments.get(4).unwrap().amount, 700);
}

#[test]
fn test_get_recent_payments() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, PaymentTracker);
    let client = PaymentTrackerClient::new(&env, &contract_id);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // Log 10 payments
    for i in 1..=10 {
        client.log_payment(&from, &to, &(i * 100));
    }

    // Get 3 most recent payments
    let payments = client.get_recent_payments(&3);
    assert_eq!(payments.len(), 3);
    // Should be in reverse order (newest first)
    assert_eq!(payments.get(0).unwrap().amount, 1000);
    assert_eq!(payments.get(1).unwrap().amount, 900);
    assert_eq!(payments.get(2).unwrap().amount, 800);
}
