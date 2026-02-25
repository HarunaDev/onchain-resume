import { describe, it, expect, beforeEach } from "vitest";
import { LiteSVM } from "litesvm";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import profileIdl from "../target/idl/profile.json";
import fs from "fs";
import path from "path";

const programId = new PublicKey("D8veRtUCxu9uVSi3pMGS363cRv4WDEysfcZoGSaKQgQs");
// console.log("IDL loaded:", !!profileIdl);
// console.log(
//   "IDL instructions:",
//   profileIdl.instructions?.map((i) => i.name)
// );

describe("profile program", () => {
  let svm: LiteSVM;
  let user: Keypair;
  let profilePda: PublicKey;
  let program: Program;

  beforeEach(() => {
    svm = new LiteSVM();
    const programBytes = fs.readFileSync(
      path.resolve(__dirname, "../target/deploy/profile.so")
    );

    svm.addProgram(programId, programBytes);
    user = Keypair.generate();

    // Airdrop with proper amount
    svm.airdrop(user.publicKey, BigInt(10 * LAMPORTS_PER_SOL));

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user.publicKey.toBuffer()],
      programId
    );
    profilePda = pda;

    program = new Program(profileIdl, programId);
  });

  it("can create / set a profile (init_if_needed)", () => {
    const fullName = "Haruna Alvin";
    const bio = "Solana dev from Lagos building dApps";
    const yearsOfExperience = new BN(6);
    const portfolio = "https://harunadev.netlify.app";
    const skills = ["Rust", "Anchor", "Next.js", "Solana"];

    // Debug info
    // console.log("User public key:", user.publicKey.toString());
    // console.log("Profile PDA:", profilePda.toString());

    // Verify PDA derivation
    // const [expectedPda] = PublicKey.findProgramAddressSync(
    //   [Buffer.from("profile"), user.publicKey.toBuffer()],
    //   programId
    // );
    // console.log(
    //   "PDA derivation correct:",
    //   expectedPda.toString() === profilePda.toString()
    // );

    // Check user balance
    // const balance = svm.getBalance(user.publicKey);
    // console.log("User balance:", balance.toString());

    // Encode instruction data
    const ixData = program.coder.instruction.encode("setProfile", {
      fullName,
      bio,
      yearsOfExperience,
      portfolio,
      skills,
    });

    // console.log("Instruction data length:", ixData.length);

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: profilePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: ixData,
    });

    // Create and send transaction
    const blockhash = svm.latestBlockhash();
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = user.publicKey;
    tx.add(ix);
    tx.sign(user);

    try {
      const txSignature = svm.sendTransaction(tx);
      // console.log("Transaction signature:", txSignature);
    } catch (error) {
      console.error("Transaction error:", error);

      // Try to get more error details
      if (error && typeof error === "object" && "logs" in error) {
        console.error("Transaction logs:", error.logs);
      }
      throw error;
    }

    // Check if account was created
    const accountInfo = svm.getAccount(profilePda);
    // console.log("Account exists after transaction:", !!accountInfo);

    // if (accountInfo) {
    //   console.log("Account owner:", accountInfo.owner.toString());
    //   console.log("Account data length:", accountInfo.data.length);
    // }

    if (!accountInfo) {
      throw new Error("Profile account not created");
    }

    // Decode and verify
    const profile = program.coder.accounts.decode(
      "profile",
      Buffer.from(accountInfo.data)
    );

    expect(profile.fullName).toBe(fullName);
    expect(profile.bio).toBe(bio);
    expect(profile.yearsOfExperience.toString()).toBe("6");
    expect(profile.portfolio).toBe(portfolio);
    expect(profile.skills).toEqual(skills);
  });

  it("can update existing profile", () => {
    // First create profile
    const createData = program.coder.instruction.encode("setProfile", {
      fullName: "Haruna Alvin",
      bio: "Solana dev from Lagos building dApps",
      yearsOfExperience: new BN(6),
      portfolio: "harunadv.netlify.app",
      skills: ["Rust", "Anchor", "Next.js", "Solana"],
    });

    const createIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: profilePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: createData,
    });

    // Send create transaction
    let blockhash = svm.latestBlockhash();
    let tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = user.publicKey;
    tx.add(createIx);
    tx.sign(user);

    try {
      svm.sendTransaction(tx);
    } catch (error) {
      console.error("Create transaction failed:", error);
      throw error;
    }

    // Verify account exists
    let accountInfo = svm.getAccount(profilePda);
    if (!accountInfo) {
      throw new Error("Profile account not created for update test");
    }

    // Now update
    const updateData = program.coder.instruction.encode("setProfile", {
      fullName: "Haruna Alvin Ojonimi",
      bio: "Call of duty gamer",
      yearsOfExperience: new BN(15),
      portfolio: "codm",
      skills: ["Reload", "Drone strike user", "ak-117 expert"],
    });

    const updateIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: profilePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: updateData,
    });

    blockhash = svm.latestBlockhash();
    tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = user.publicKey;
    tx.add(updateIx);
    tx.sign(user);

    try {
      svm.sendTransaction(tx);
    } catch (error) {
      console.error("Update transaction failed:", error);
      throw error;
    }

    // Verify update
    accountInfo = svm.getAccount(profilePda);
    if (!accountInfo) {
      throw new Error("Profile account not found after update");
    }

    const profile = program.coder.accounts.decode(
      "profile",
      Buffer.from(accountInfo.data)
    );

    expect(profile.fullName).toBe("Haruna Alvin Ojonimi");
    expect(profile.yearsOfExperience.toString()).toBe("15");
    expect(profile.skills).toEqual(["Reload", "Drone strike user", "ak-117 expert"]);
  });
});