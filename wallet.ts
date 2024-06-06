import * as util from "./util";
import type { RPCInterface } from "./rpc";

/** Wallets are created from seeds, so they can have multiple addresses by changing the index. Use Wallets to "write" (send, receive, change rep) to the network */
export class Wallet {
  readonly seed: string;
  readonly rpc: RPCInterface;
  index: number = 0;
  
  /**
   * @param {string} [seed] Seed for the wallet from which private keys are derived. 64 character hex string (32 bytes)
  */
  constructor(rpc: RPCInterface, seed: string) {
    this.seed = seed;
  }
  /** Generate a cryptographically secure random wallet using [crypto.getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues) */
  static gen_random_wallet(rpc: RPCInterface): Wallet {
    let random_bytes = new Uint8Array(32);
    crypto.getRandomValues(random_bytes);
    const random_seed = util.uint8array_to_hex(random_bytes);
    return new Wallet(rpc, random_seed);
  }
  //
}

