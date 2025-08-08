import * as util from "./util";
import type { AccountInfoRPC, AccountReceivableRPC, AccountReceivableThresholdRPC, AccountReceivableSourceRPC, Address, Block, BlockNoSignature, BlockSubtype, BlockHash } from "./rpc_types";
import type { RPCInterface } from "./rpc";
import type { WorkFunction } from "./work";

/** wallets are created from seeds, so they can have multiple addresses by changing the index. use wallets to "write" (send, receive, change rep) to the network */
export class Wallet {
  readonly seed: string;
  readonly rpc: RPCInterface;
  /** Seed index. Seeds can have multiple private keys and addresses */
  index: number;

  add_do_work: boolean = true;
  work_function?: WorkFunction;

  /**
   * @param {string} [seed] Seed for the wallet from which private keys are derived. 64 character hex string (32 bytes)
   */
  constructor(rpc: RPCInterface, seed: string, index: number = 0, work_function?: WorkFunction) {
    this.rpc = rpc;
    if (typeof seed !== "string" || seed?.length !== 64) throw Error("Seed needs to be 64 character (hex) string");
    this.seed = seed;
    this.index = index;
    this.work_function = work_function;
  }

  /** Generate a cryptographically secure random wallet using [crypto.getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) */
  static gen_random_wallet(rpc: RPCInterface): Wallet {
    let random_bytes = new Uint8Array(32);
    crypto.getRandomValues(random_bytes);
    const random_seed = util.uint8array_to_hex(random_bytes);
    return new Wallet(rpc, random_seed);
  }

  //Own properties
  get private_key(): string {
    return util.get_private_key_from_seed(this.seed, this.index);
  }
  get public_key(): string {
    return util.get_public_key_from_private_key(this.private_key);
  }
  get address(): Address {
    return util.get_address_from_public_key(this.public_key);
  }

  //Actions
  async send_process(block: Block, subtype: BlockSubtype): Promise<BlockHash> {
    return (
      await this.rpc.call({
        action: "process",
        json_block: "true",
        subtype,
        block,
        do_work: !block.work && this.add_do_work ? true : undefined,
      })
    ).hash as BlockHash;
  }
  /**
   * @param {Address} [to] address to send to
   * @param {util.Whole} [amount] amount in whole bananos to send
   * @param {boolean?} [gen_work] whether or not to call work function to generate work
   * @param {string?} [representative] optionally provide a representative if you do not want to use the current representative
   * @param {AccountInfoRPC?} [cached_account_info] can save one rpc call in some cases. Mostly for internal use. Make sure that in the RPC call, "representative" is "true"
   Send Bananos
  */
  async send(to: Address, amount: util.Whole, gen_work?: boolean, representative?: Address, cached_account_info?: AccountInfoRPC): Promise<BlockHash> {
    const raw_send = util.whole_to_raw(amount, this.rpc.DECIMALS);
    const info = cached_account_info ?? (await this.get_account_info(undefined, true)); //this should be lazy. the true makes sure representative is included
    const pub_receive = util.get_public_key_from_address(to);
    if (representative === undefined) {
      if (info.representative === undefined) throw Error("Missing field 'representative' in `cached_account_info`");
      representative = info.representative;
    }
    const before_balance = BigInt(info.balance);
    const new_balance = before_balance - raw_send;
    if (new_balance < 0n) {
      throw Error(`Insufficient funds to send. Cannot send more than balance; ie, Before balance (raw: ${before_balance}) less than send amount (raw: ${raw_send})`);
    }
    const block_ns: BlockNoSignature = {
      type: "state",
      account: this.address,
      previous: info.frontier,
      representative,
      balance: new_balance.toString() as `${number}`, //you gotta trust me here typescript
      //link is public key of account to send to
      link: pub_receive,
      link_as_account: to,
    };
    const s_block_hash = util.hash_block(block_ns); //block hash of the send block
    let work = undefined;
    if (gen_work && this.work_function) work = await this.work_function(info.frontier);
    const signature = util.sign_block_hash(this.private_key, s_block_hash);
    const block = { ...block_ns, signature, work };
    return await this.send_process(block, "send");
  }
  /** Send by passing in a fixed final balance */
  async send_fixed_final_bal(to: Address, end_bal: util.Whole, gen_work?: boolean, representative?: Address, cached_account_info?: AccountInfoRPC): Promise<BlockHash> {
    const raw_end = util.whole_to_raw(end_bal, this.rpc.DECIMALS);
    const info = cached_account_info ?? (await this.get_account_info(undefined, true)); //this should be lazy. the true makes sure representative is included
    const pub_receive = util.get_public_key_from_address(to);
    if (representative === undefined) {
      if (info.representative === undefined) throw Error("Missing field 'representative' in `cached_account_info`");
      representative = info.representative;
    }
    if (raw_end < 0n) {
      throw Error(`End balance cannot be negative`);
    }
    const block_ns: BlockNoSignature = {
      type: "state",
      account: this.address,
      previous: info.frontier,
      representative,
      balance: raw_end.toString() as `${number}`, //you gotta trust me here typescript
      //link is public key of account to send to
      link: pub_receive,
      link_as_account: to,
    };
    const s_block_hash = util.hash_block(block_ns); //block hash of the send block
    let work = undefined;
    if (gen_work && this.work_function) work = await this.work_function(info.frontier);
    const signature = util.sign_block_hash(this.private_key, s_block_hash);
    const block = { ...block_ns, signature, work };
    return await this.send_process(block, "send");
  }
  /* Send all Bananos */
  async send_all(to: Address, work?: boolean, representative?: Address): Promise<BlockHash> {
    const info = await this.get_account_info(undefined, true);
    return await this.send(to, util.raw_to_whole(BigInt(info.balance), this.rpc.DECIMALS), work, representative, info);
  }
  /**
   * @param {BlockHash} [block_hash] send block to receive
   * @param {boolean?} [gen_work] whether or not to call work function to generate work
   * @param {Address?} [representative] optionally provide a representative if you do not want to use the current representative
   receive bananos from a specific send block
  */
  async receive(block_hash: BlockHash, gen_work?: boolean, representative?: Address): Promise<BlockHash> {
    //doesn't matter if open or not, I think?
    const block_info = await this.rpc.get_block_info(block_hash);
    let before_balance = 0n;
    let previous;
    try {
      const info = await this.get_account_info(undefined, true);
      previous = info.frontier;
      if (!representative) representative = info.representative;
      before_balance = BigInt(info.balance);
    } catch (e) {
      //todo, check if error message is "Account not found"
      //console.log(e)
      //unopened account probably
      previous = "0".repeat(64);
    }
    if (representative === undefined) representative = this.address;
    const block_ns: BlockNoSignature = {
      type: "state",
      account: this.address,
      previous,
      representative,
      // prettier-ignore
      balance: ((before_balance + BigInt(block_info.amount)).toString() as `${number}`),
      //link is hash of send block
      link: block_hash,
    };
    const r_block_hash = util.hash_block(block_ns); //block hash of the receive block
    let work = undefined;
    if (gen_work && this.work_function) work = await this.work_function(previous === "0".repeat(64) ? this.public_key : previous);
    const signature = util.sign_block_hash(this.private_key, r_block_hash);
    const block = { ...block_ns, signature, work };
    return await this.send_process(block, "receive");
  }
  //todo: might have some error with multiple receives?
  /**
   * @param {number} [count=20] Max amount of blocks to receive
   receive all (up to count and exceeding threshold if applicable) receivable blocks
   * @param {`${number}`?} [threshold] Min amount of Banano to receive in whole
   * @param {boolean?} [gen_work] whether or not to call work function to generate work
   Receive all receivable transactions (up to count, and over threshold
  */
  async receive_all(count: number = 20, threshold?: `${number}`, gen_work?: boolean): Promise<BlockHash[]> {
    const to_receive = ((await this.get_account_receivable(count, threshold, true)) as AccountReceivableSourceRPC).blocks;
    let previous, representative, before_balance;
    try {
      const info = await this.get_account_info(undefined, true);
      previous = info.frontier;
      representative = info.representative;
      before_balance = BigInt(info.balance);
    } catch (e) {
      //todo, check if error message is "Account not found"
      //console.log(e)
      //unopened account probably
      previous = "0".repeat(64);
      before_balance = BigInt(0);
    }
    if (representative === undefined) representative = this.address;
    let receive_block_hashes: BlockHash[] = [];
    for (const receive_hash of Object.keys(to_receive)) {
      const new_balance = (before_balance + BigInt(to_receive[receive_hash].amount)).toString() as `${number}`;
      const block_ns: BlockNoSignature = {
        type: "state",
        account: this.address,
        previous,
        representative,
        balance: new_balance,
        //link is hash of send block
        link: receive_hash,
      };
      const r_block_hash = util.hash_block(block_ns); //block hash of the receive block
      let work = undefined;
      if (gen_work && this.work_function) work = await this.work_function(previous === "0".repeat(64) ? this.public_key : previous);
      const signature = util.sign_block_hash(this.private_key, r_block_hash);
      const block = { ...block_ns, signature, work };
      await this.send_process(block, "receive");
      receive_block_hashes.push(r_block_hash);
      previous = r_block_hash;
      before_balance = BigInt(new_balance);
    }
    return receive_block_hashes;
  }
  /**
   * @param {Address} [new_representative] banano address to change representative to
   * @param {boolean?} [gen_work] whether or not to call work function to generate work
   */
  async change_representative(new_representative: Address, gen_work?: boolean): Promise<BlockHash> {
    const info = await this.get_account_info();
    const block_ns: BlockNoSignature = {
      type: "state",
      account: this.address,
      previous: info.frontier,
      representative: new_representative,
      balance: info.balance,
      //link is 0
      link: "0".repeat(64),
    };
    const c_block_hash = util.hash_block(block_ns); //block hash of the change block
    let work = undefined;
    if (gen_work && this.work_function) work = await this.work_function(info.frontier);
    const signature = util.sign_block_hash(this.private_key, c_block_hash);
    const block = { ...block_ns, signature, work };
    return await this.send_process(block, "change");
  }
  /* alias for the change_representative method */
  async change_rep(new_representative: Address, work?: boolean): Promise<BlockHash> {
    return await this.change_representative(new_representative, work);
  }

  //Double wrapped functions
  async get_account_info(include_confirmed?: boolean, representative?: boolean, weight?: boolean, pending?: boolean): Promise<AccountInfoRPC> {
    return await this.rpc.get_account_info(this.address, include_confirmed, representative, weight, pending);
  }
  async get_account_receivable(count?: number, threshold?: `${number}`, source?: boolean): Promise<AccountReceivableRPC | AccountReceivableThresholdRPC | AccountReceivableSourceRPC> {
    return await this.rpc.get_account_receivable(this.address, count, threshold, source);
  }
  //
  /* Sign a message with the current private key. Signing is a way to cryptographically prove that someone posesses a certain private key without revealing the actual private key */
  sign_message(message: string): string {
    return util.sign_message(this.private_key, message);
  }
}

/** Does everything a `Wallet` can do, except a private key is put in instead of a seed, and so limited to one address. Means changing `.index` will not do anything obviously. */
export class PrivateKeyAccount extends Wallet {
  _private_key: string;
  /**
   * @param {string} [private_key] Private key. 64 character hex string (32 bytes)
   */
  constructor(rpc: RPCInterface, private_key: string, work_function?: WorkFunction) {
    if (typeof private_key !== "string" || private_key?.length !== 64) throw Error("Priv key needs to be 64 character (hex) string");
    super(rpc, private_key, 0, work_function);
    this._private_key = private_key;
  }
  get private_key(): string {
    return this._private_key;
  }
}
