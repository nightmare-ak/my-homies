#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{token, Address, Env};

fn create_token<'a>(
    e: &'a Env,
    admin: &Address,
) -> (token::Client<'a>, token::StellarAssetClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    let client = token::Client::new(e, &sac.address());
    let sac_client = token::StellarAssetClient::new(e, &sac.address());
    (client, sac_client)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&token.address, &100_i128);

    assert_eq!(client.get_bet(), 100);
    assert_eq!(client.get_pool(), 0);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token, _) = create_token(&env, &admin);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&token.address, &100_i128);
    client.initialize(&token.address, &200_i128); // should panic
}

#[test]
fn test_fund() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);

    token_admin.mint(&admin, &10_000);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&token.address, &100_i128);

    assert_eq!(client.get_pool(), 0);

    client.fund(&admin, &5_000);

    assert_eq!(client.get_pool(), 5_000);
    assert_eq!(token.balance(&admin), 5_000);
}

#[test]
fn test_flip_win_or_lose() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let player = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);

    // Mint — admin gets prize-pool tokens, player gets betting tokens
    token_admin.mint(&admin, &10_000);
    token_admin.mint(&player, &1_000);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&token.address, &100_i128);

    // Fund the prize pool
    client.fund(&admin, &5_000);
    assert_eq!(client.get_pool(), 5_000);

    let balance_before = token.balance(&player);
    let pool_before = client.get_pool();

    let won = client.flip(&player, &true);

    let balance_after = token.balance(&player);
    let pool_after = client.get_pool();

    if won {
        // Win: -100 (bet) + 200 (payout) = +100 net
        assert_eq!(balance_after, balance_before + 100);
        // Pool: +100 (bet) - 200 (payout) = -100
        assert_eq!(pool_after, pool_before - 100);
    } else {
        // Lose: -100 (bet) only
        assert_eq!(balance_after, balance_before - 100);
        // Pool: +100 (bet)
        assert_eq!(pool_after, pool_before + 100);
    }
}

#[test]
fn test_multiple_flips() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let player = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);

    token_admin.mint(&admin, &100_000);
    token_admin.mint(&player, &10_000);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&token.address, &100_i128);
    client.fund(&admin, &50_000);

    let mut wins = 0u32;
    let mut losses = 0u32;

    for _ in 0..20 {
        let won = client.flip(&player, &true);
        if won {
            wins += 1;
        } else {
            losses += 1;
        }
        // Refund the player so they can keep playing
        token_admin.mint(&player, &100);
    }

    // With 20 flips we should have at least one of each
    assert!(wins > 0, "expected at least one win in 20 flips");
    assert!(losses > 0, "expected at least one loss in 20 flips");
}

#[test]
fn test_flip_insufficient_funds_in_pool() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let player = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);

    token_admin.mint(&admin, &1_000);
    token_admin.mint(&player, &1_000);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&token.address, &100_i128);

    // Fund the pool with just enough for one bet + payout
    client.fund(&admin, &200);

    // The player can still flip — the contract has enough to pay a winner
    // (200 pool + 100 from player = 300, which covers 200 payout)
    client.flip(&player, &true);
}

#[test]
fn test_fund_from_anyone() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let (token, token_admin) = create_token(&env, &admin);

    token_admin.mint(&admin, &10_000);
    token_admin.mint(&user, &5_000);

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&token.address, &100_i128);

    // A regular user can fund the pool too
    client.fund(&user, &1_000);
    assert_eq!(client.get_pool(), 1_000);
    assert_eq!(token.balance(&user), 4_000);
}
