import blake2b from "blake2b";
import { uint8array_to_hex, int_to_uint8array, hex_to_uint8array } from "./util";
import type { BlockHash } from "./rpc_types";
import type { RPC } from "./rpc";

const BANANO_WORK_THRESHOLD = "0xFFFFFE0000000000";

export type WorkFunction = (block_hash: BlockHash) => Promise<string>;

export interface WorkProvider {
  request_work: WorkFunction;
}

/** Request work from an RPC provider that supports the `work_generate` RPC call */
export class RPCWorkProvider implements WorkProvider {
  readonly rpc: RPC;

  /** Extra json to send with the rpc payload. Needed for rpc.nano.to's work_generate, unfortunately */
  extra_payload: Record<string, any> = {};

  constructor(rpc: RPC) {
    this.rpc = rpc;
  }

  async request_work(block_hash: BlockHash): Promise<string> {
    return (
      await this.rpc.call({
        action: "work_generate",
        hash: block_hash,
        ...this.extra_payload,
      })
    ).work;
  }
}

/** Use Javascript to slowly generate work for blocks */
export class SlowJavascriptWorkProvider implements WorkProvider {
  async request_work(block_hash: BlockHash): Promise<string> {
    let nonce = 0;
    while (true) {
      const nonce_bytes = int_to_uint8array(nonce, 8).reverse();
      const work = uint8array_to_hex(blake2b(8, undefined, undefined, undefined, true).update(nonce_bytes).update(hex_to_uint8array(block_hash)).digest().reverse()); //noAssert = true so we can have byte of 8 (min for this library is 16 for some reason)
      if (BigInt(`0x${work}`) > BigInt(BANANO_WORK_THRESHOLD)) {
        return uint8array_to_hex(nonce_bytes.reverse());
      }
      nonce += 1;
    }
  }
}
