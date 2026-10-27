import fs from "fs";
import os from "os";
import path from "path";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import idl from "./idl/counter.json";
import { Counter } from "./idl/counter";

export const CLUSTER = "devnet";
export const RPC_URL = "https://api.devnet.solana.com";
const WALLET_PATH = path.join(os.homedir(), ".config", "solana", "id.json");

export const connection = new Connection(RPC_URL, "confirmed");

export function loadWallet(): Keypair {
  const secret = JSON.parse(fs.readFileSync(WALLET_PATH, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

export function getProgram(wallet: Keypair): Program<Counter> {
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    { commitment: "confirmed" },
  );
  return new Program(idl as Counter, provider);
}

export function counterAddress(owner: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), owner.toBuffer()],
    new PublicKey(idl.address),
  );
  return address;
}
