import type { BlockHash } from "./rpc_types";
import type { RPC } from "./rpc";

export interface WorkProvider {
  request_work(block_hash: BlockHash): Promise<string>;
}

export class RPCWorkProvider {
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

//
