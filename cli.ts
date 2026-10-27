import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  CLUSTER,
  connection,
  counterAddress,
  getProgram,
  loadWallet,
} from "./config";

function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`;
}

async function balance(): Promise<void> {
  const wallet = loadWallet();
  const lamports = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`Balance: ${lamports / LAMPORTS_PER_SOL} SOL`);
}

async function status(): Promise<void> {
  const program = getProgram(loadWallet());
  const info = await connection.getAccountInfo(program.programId);
  console.log("Cluster: ", CLUSTER);
  console.log("RPC:     ", connection.rpcEndpoint);
  console.log("Program: ", program.programId.toBase58());
  console.log("Deployed:", info?.executable ?? false);
  await balance();
}

async function airdrop(sol: number): Promise<void> {
  const wallet = loadWallet();
  console.log(`Requesting ${sol} SOL on ${CLUSTER}...`);
  const signature = await connection.requestAirdrop(
    wallet.publicKey,
    sol * LAMPORTS_PER_SOL,
  );
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...latest });
  console.log("Airdrop confirmed:", explorerUrl(signature));
  await balance();
}

async function init(): Promise<void> {
  const wallet = loadWallet();
  const program = getProgram(wallet);
  const counter = counterAddress(wallet.publicKey);

  const signature = await program.methods
    .initialize()
    .accountsPartial({ counter, user: wallet.publicKey })
    .rpc();

  console.log("Counter PDA:", counter.toBase58());
  console.log("Transaction:", explorerUrl(signature));
}

async function increment(owner?: string): Promise<void> {
  const wallet = loadWallet();
  const program = getProgram(wallet);
  const target = owner ? new PublicKey(owner) : wallet.publicKey;
  const counter = counterAddress(target);

  const signature = await program.methods
    .increment()
    .accountsPartial({ counter, authority: wallet.publicKey })
    .rpc();

  console.log("Incremented:", explorerUrl(signature));
  await get();
}

async function get(owner?: string): Promise<void> {
  const wallet = loadWallet();
  const program = getProgram(wallet);
  const target = owner ? new PublicKey(owner) : wallet.publicKey;
  const address = counterAddress(target);
  const account = await program.account.counter.fetch(address);
  console.log("Counter:  ", address.toBase58());
  console.log("Count:    ", account.count.toString());
  console.log("Authority:", account.authority.toBase58());
}

const commands: Record<string, (arg?: string) => Promise<void>> = {
  status: () => status(),
  balance: () => balance(),
  airdrop: (amount) => airdrop(Number(amount ?? "1")),
  init: () => init(),
  increment: (owner) => increment(owner),
  get: (owner) => get(owner),
};

async function main(): Promise<void> {
  const [name, arg] = process.argv.slice(2);
  const run = commands[name ?? ""];
  if (!run) {
    const names = Object.keys(commands).join("|");
    console.log(`Usage: npm run cli -- <${names}>`);
    process.exit(1);
  }
  await run(arg);
}

main().catch((e) => {
  const message = e instanceof Error ? e.message : String(e);
  console.error("Error:", message);
  if (/airdrop|429/i.test(message)) {
    console.error("Rate limited? Wait, or use faucet.solana.com");
  }
  process.exit(1);
});
