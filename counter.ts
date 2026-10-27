import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { Counter } from "../target/types/counter";

describe("counter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.counter as Program<Counter>;

  const authority = provider.wallet.publicKey;
  const attacker = Keypair.generate();

  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), authority.toBuffer()],
    program.programId,
  );

  it("initializes at 0", async () => {
    await program.methods
      .initialize()
      .accountsPartial({ counter: counterPda, user: authority })
      .rpc();

    const acc = await program.account.counter.fetch(counterPda);
    assert.equal(acc.count.toNumber(), 0);
    assert.isTrue(acc.authority.equals(authority));
  });

  it("increments to 1", async () => {
    await program.methods
      .increment()
      .accountsPartial({ counter: counterPda, authority })
      .rpc();

    const acc = await program.account.counter.fetch(counterPda);
    assert.equal(acc.count.toNumber(), 1);
  });

  it("increments again to 2", async () => {
    await program.methods
      .increment()
      .accountsPartial({ counter: counterPda, authority })
      .rpc();

    const acc = await program.account.counter.fetch(counterPda);
    assert.equal(acc.count.toNumber(), 2);
  });

  it("cannot increment someone else's counter", async () => {
    try {
      await program.methods
        .increment()
        .accountsPartial({ counter: counterPda, authority: attacker.publicKey })
        .signers([attacker])
        .rpc();
      assert.fail("should have thrown");
    } catch (e: any) {
      const code = e.error?.errorCode?.code;
      assert.include(["ConstraintSeeds", "ConstraintHasOne"], code);
    }
    const acc = await program.account.counter.fetch(counterPda);
    assert.equal(acc.count.toNumber(), 2);
  });
});
