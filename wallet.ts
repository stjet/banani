import * as util from "./util";
import type { AccountInfoRPC, Address, Block, BlockNoSignature, BlockSubtype, BlockHash } from "./rpc_types";
import type { RPCInterface, RPC } from "./rpc";

/** Wallets are created from seeds, so they can have multiple addresses by changing the index. Use Wallets to "write" (send, receive, change rep) to the network */
export class Wallet {
  readonly seed: string;
  readonly rpc: RPCInterface;
  /** Seed index. Seeds can have multiple private keys and addresses */
  index: number;

  try_work: boolean;
  add_do_work: boolean = false;
  
  /**
   * @param {string} [seed] Seed for the wallet from which private keys are derived. 64 character hex string (32 bytes)
  */
  constructor(rpc: RPCInterface, seed: string, index: number = 0, try_work: boolean = false) {
    this.seed = seed;
    this.index = index;
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
   * @param {string} [work] optionally provide work
   * @param {string} [previous] optionally provide a previous if you do not want to use the current frontier
   * @param {string} [representative] optionally provide a representative if you do not want to use the current representative
  */
  async send(to: Address, amount: util.Whole, work?: string, previous?: BlockHash, representative?: Address): Promise<BlockHash> {
    let raw_send = util.whole_to_raw(amount);
    let info = await this.get_account_info();
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
    let block: BlockNoSignature = {
      type: "state",
      account: this.address,
      previous,
      representative,
      balance: new_balance.toString() as `${number}`, //you gotta trust me here typescript
      //link is public key of account to send to
      link: pub_receive,
      link_as_account: to,
    };
    //
    return "placeholder";
  }
  //

  //Double wrapped functions
  async get_account_info(include_confirmed?: boolean, representative?: boolean, weight?: boolean, pending?: boolean): Promise<AccountInfoRPC> {
    return await this.rpc.get_account_info(this.address, include_confirmed, representative, weight, pending);
  }
  //
}

