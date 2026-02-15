use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

// #[cfg(test)]
// mod tests;

declare_id!("D8veRtUCxu9uVSi3pMGS363cRv4WDEysfcZoGSaKQgQs");

// Anchor adds an 8-byte label to everything we store.
pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

// Program macro
#[program]
// rust program
pub mod profile {
    // use what we imported from anchor
    use super::*;

    // pass in arguments for context
    pub fn set_profile(
        context: Context<SetProfile>, full_name: String, bio: String, years_of_experience: u64, portfolio: String, skills: Vec<String>) -> Result<()> {
        // set profile function body
        msg!("Greetings from {}", context.program_id); //the message macro to print out a message to the user

        let user_public_key = context.accounts.user.key();
        msg!("User {}, is a {}, with {} years on experience. skills include {:?}. You can visit their portfolio to learn more {}", 
        full_name,
        bio,
        years_of_experience,
        skills,
        portfolio
        ); // format message

        //Write the information into the profile account provided.
        context.accounts.profile.set_inner( Profile {
            full_name,
            bio,
            years_of_experience,
            skills,
            portfolio
        });
        Ok(())

    }
}

// Marks this struct as a storable blockchain account
#[account]
// Ensures you allocate enough space when creating accounts
#[derive(InitSpace)]
// Defines the data fields for user profiles
pub struct Profile {

    #[max_len(40)]
    pub full_name: String,

    #[max_len(80)]
    pub bio: String,

    pub years_of_experience: u64,

    #[max_len(40)]
    pub portfolio: String,

    #[max_len(5, 50)]
    pub skills: Vec<String>,
}

#[derive(Accounts)]
pub struct SetProfile<'info> {
    // Creates a container named SetProfile that holds all accounts needed for the set_profile instruction.
    // 'info indicates that these items will live for the lifetime of a Solana account info object

    #[account(mut)] // set signer to mutable because they will pay to create a profile on the blockchain
    pub user: Signer<'info>, // the transaction must be signed by this account

    #[account(
        init_if_needed, // create an account if it does not exist
        payer = user, // specify the payer as the person who signs to create an account on the blockchain
        space = ANCHOR_DISCRIMINATOR_SIZE + Profile::INIT_SPACE, // specify the space(every account has about 8bits + profile struct)
        seeds = [b"profile", user.key().as_ref()], // seed as the text 'profile' and the user's public key. (Seeds are what are used  to give the account an address; it is a program-derived address.)
        bump // Finds a valid Solana address
    )]
    // The new account is being created with the seeds and allocated space required
    pub profile: Account<'info, Profile>,

    pub system_program: Program<'info, System>, // Passes a reference to Solana's built-in System Program (needed to create new accounts).
}