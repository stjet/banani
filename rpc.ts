import type { BlockCountRPC } from "./rpc_types";

/** Implement this interface if the built-in RPC class does not fit your needs. The easiest way to do this is by just extending the built-in RPC class */
export interface RPCInterface {
  readonly rpc_url: string;
  use_pending: boolean;
  call(payload: Record<string, any>): Promise<Record<string, string>>;
  get_block_count(): Promise<BlockCountRPC>;
  //
}

/** Sends RPC requests to the RPC node, also has wrappers for actions that only read the network (write actions are handled by the Wallet class) */
export class RPC implements RPCInterface {
  readonly rpc_url: string;

  readonly use_pending: boolean;

  /** HTTP headers to send with any RPC requests */
  headers: Record<string, string> | undefined;

  /**
   * @param {boolean} [use_pending = false] If true, uses "pending" instead of "receivable" in RPC action names, for compatibility with older versions of the node
  */
  constructor(rpc_url: string, use_pending: boolean = false) {
    this.rpc_url = rpc_url;
    this.use_pending = use_pending;
  }
  /** The function that sends the RPC POST request */
  async call(payload: Record<string, any>): Promise<Record<string, any>> {
    const resp = await fetch(this.rpc_url, {
      method: "POST",
      headers: this.headers ?? {},
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw Error(`Request to RPC node failed with status code ${resp.status}`);
    const resp_json = await resp.json();
    if (resp_json.error) throw Error(`RPC node response: ${resp_json.error}`);
    return resp_json;
  }
  /** See https://docs.nano.org/commands/rpc-protocol/#block_count */
  async get_block_count(): Promise<BlockCountRPC> {
    return (await this.call({
      "action": "block_count",
    })) as BlockCountRPC;
  }
  //
}
