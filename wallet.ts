import * as util from "./util";
import type { AccountInfoRPC, Address, Block, BlockNoSignature, BlockSubtype, BlockHash } from "./rpc_types";
import type { RPCInterface, RPC } from "./rpc";

export type WorkFunction = (block_hash: BlockHash) => Promise<string>;

/** Wallets are created from seeds, so they can have multiple addresses by changing the index. Use Wallets to "write" (send, receive, change rep) to the network */
export class Wallet {
  readonly seed: string;
  readonly rpc: RPCInterface;
  /** Seed index. Seeds can have multiple private keys and addresses */
  index: number;

  try_work: boolean;
  add_do_work: boolean = false;
  work_function?: WorkFunction;
  
  /**
   * @param {string} [seed] Seed for the wallet from which private keys are derived. 64 character hex string (32 bytes)
  */
  constructor(rpc: RPCInterface, seed: string, index: number = 0, try_work: boolean = false, work_function?: WorkFunction) {
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
    return (await this.rpc.call({
      action: "process",
      json_block: "true",
      subtype,
      block,
      do_work: (!block.work && this.add_do_work) ? "true" : undefined,
    })).hash as BlockHash;
  }
  //send, send_all, receive, receive_all, change_representative, sign_message_in_dummy_block
  //todo, work = true means generate work locally
  /**
   * @param {boolean?} [gen_work] whether or not to call work function to generate work
   * @param {string?} [previous] optionally provide a previous if you do not want to use the current frontier
   * @param {string?} [representative] optionally provide a representative if you do not want to use the current representative
   * @param {AccountInfoRPC?} [cached_account_info]can save one rpc call in some cases. mostly for internal use 
  */
  async send(to: Address, amount: util.Whole, gen_work?: boolean, previous?: BlockHash, representative?: Address, cached_account_info?: AccountInfoRPC): Promise<BlockHash> {
    let raw_send = util.whole_to_raw(amount);
    let info = cached_account_info ?? await this.get_account_info(); //this should be lazy
    let pub_receive = util.get_public_key_from_address(to);
    let bprevious: BlockHash = previous;
    if (!previous) bprevious = info.frontier;
    let brepresentative = representative;
    if (!representative) brepresentative = info.representative;
    let before_balance = BigInt(info.balance);
    let new_balance = before_balance - raw_send;
    if (new_balance < 0n) {
      throw Error(`Insufficient funds to send. Cannot send more than balance; ie, Before balance (raw: ${before_balance}) less than send amount (raw: ${raw_send})`);
    }
    let block_ns: BlockNoSignature = {
      type: "state",
      account: this.address,
      previous,
      representative,
      balance: new_balance.toString() as `${number}`, //you gotta trust me here typescript
      //link is public key of account to send to
      link: pub_receive,
      link_as_account: to,
    };
    let block_hash = util.hash_block(block_ns);
    let work = undefined;
    if (gen_work) work = await this.work_function(block_hash);
    let signature = util.sign_block_hash(this.private_key, block_hash);
    let block = { ...block_ns, signature, work };
    return this.send_process(block, "send");
  }
  async send_all(to: Address, work?: boolean, previous?: BlockHash, representative?: Address): Promise<BlockHash> {
    let info = await this.get_account_info();
    return await this.send(to, info.balance, work, previous, representative, info);
  }
  /*
  async receive(block_hash: string, work?: boolean, previous?: BlockHash, representative?: Address): Promise<BlockHash> {
    //doesn't matter if open or not, I think?
    let block_info = await this.rpc.get_block_info(block_hash);
    //
  }
  async receive_all(): Promise<BlockHash[]> {
    //
  }
  async change_representative(new_rep: Address, work?: boolean, previous?: BlockHash): Promise<BlockHash> {
    //
  }
  */
  /* alias for change_representative */
  /*
  async change_rep(new_rep: Address, work?: boolean, previous?: BlockHash): Promise<BlockHash> {
    return await this.change_representative(new_rep, work, previous);
  }
  */

  //Double wrapped functions
  async get_account_info(include_confirmed?: boolean, representative?: boolean, weight?: boolean, pending?: boolean): Promise<AccountInfoRPC> {
    return await this.rpc.get_account_info(this.address, include_confirmed, representative, weight, pending);
  }
  //
  sign_message(message: string): string {
    return util.sign_message(this.private_key, message);
  }
}

