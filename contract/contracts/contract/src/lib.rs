#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, token, Address, Env};

#[contracttype]
pub enum DataKey {
    Token,
    Bet,
}

#[contractevent]
pub struct FlipWin {
    #[topic]
    player: Address,
    guess: bool,
    outcome: bool,
    amount: i128,
}

#[contractevent]
pub struct FlipLose {
    #[topic]
    player: Address,
    guess: bool,
    outcome: bool,
    amount: i128,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn initialize(env: Env, token: Address, bet: i128) {
        if env.storage().instance().has(&DataKey::Token) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Bet, &bet);
    }

    /// Player guesses heads (true) or tails (false).
    /// Transfers `bet` tokens from player to contract.
    /// If correct, sends `2 * bet` tokens back (profit of `bet`).
    /// If wrong, contract keeps the bet (grows the prize pool).
    pub fn flip(env: Env, player: Address, guess: bool) -> bool {
        player.require_auth();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let bet: i128 = env.storage().instance().get(&DataKey::Bet).unwrap();

        // Transfer bet from player to contract prize pool
        token::Client::new(&env, &token).transfer(&player, &env.current_contract_address(), &bet);

        // Deterministic-but-unpredictable coin flip via Soroban PRNG
        let outcome = env.prng().gen::<u64>() % 2 == 0;

        if outcome == guess {
            // Win — send double the bet back
            token::Client::new(&env, &token)
                .transfer(&env.current_contract_address(), &player, &(bet * 2));
            FlipWin {
                player,
                guess,
                outcome,
                amount: bet * 2,
            }
            .publish(&env);
            true
        } else {
            FlipLose {
                player,
                guess,
                outcome,
                amount: bet,
            }
            .publish(&env);
            false
        }
    }

    /// Anyone can donate tokens to the prize pool.
    pub fn fund(env: Env, from: Address, amount: i128) {
        from.require_auth();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token).transfer(&from, &env.current_contract_address(), &amount);
    }

    /// Returns the current token balance of the contract (prize pool).
    pub fn get_pool(env: Env) -> i128 {
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token).balance(&env.current_contract_address())
    }

    /// Returns the bet amount per flip.
    pub fn get_bet(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Bet).unwrap()
    }
}

mod test;
