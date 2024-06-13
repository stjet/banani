import * as util from "./util";
import type { Address, Block, BlockSubtype, BlockHash } from "./rpc_types";
import type { RPCInterface, RPC } from "./rpc";

/** Wallets are created from seeds, so they can have multiple addresses by changing the index. Use Wallets to "write" (send, receive, change rep) to the network */
export class Wallet {
  readonly seed: string;
  readonly rpc: RPCInterface;
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
  get public_key(): string {
    //
    return "placeholder";
  }
  get address(): Address {
    //
    return "ban_placeholder";
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

  //Double wrapped functions
  //
}

