import type { Address, BlockHash, BlockCountRPC, BlockInfoRPC, BlocksRPC, BlocksInfoRPC, RepresentativesRPC, RepresentativesOnlineRPC, RepresentativesOnlineWeightRPC, AccountHistoryRPC, AccountHistoryRawRPC, AccountInfoRPC, AccountBalanceRPC, AccountsBalancesRPC, AccountRepresentativeRPC, AccountsRepresentativesRPC, AccountWeightRPC, AccountReceivableRPC, AccountReceivableThresholdRPC, AccountReceivableSourceRPC, DelegatorsRPC, DelegatorsCountRPC } from "./rpc_types";
import { whole_to_raw } from "./util";

/** Implement this interface if the built-in RPC class does not fit your needs. The easiest way to do this is by just extending the built-in RPC class */
export interface RPCInterface {
  rpc_url: string;
  use_pending: boolean;
  DECIMALS?: number;
  call(payload: Record<string, any>): Promise<Record<string, string>>;
  get_block_info(block_hash: BlockHash): Promise<BlockInfoRPC>;
  get_account_info(account: Address, include_confirmed?: boolean, representative?: boolean, weight?: boolean, pending?: boolean): Promise<AccountInfoRPC>;
  get_account_receivable(account: Address, count?: number, threshold?: `${number}`, source?: boolean): Promise<AccountReceivableRPC | AccountReceivableThresholdRPC | AccountReceivableSourceRPC>;
}

/** Sends RPC requests to the RPC node, also has wrappers for actions that only read the network (write actions are handled by the Wallet class) */
export class RPC implements RPCInterface {
  rpc_url: string;

  use_pending: boolean;
  DECIMALS = undefined; //for nano, change to nano decimals

  debug: boolean = false;

  /** HTTP headers to send with any RPC requests, defaults to { "Content-Type": "application/json" } */
  headers: Record<string, string> | undefined;

  /**
   * @param {boolean} [use_pending = false] If true, uses "pending" instead of "receivable" in RPC action names, for compatibility with older versions of the node
   */
  constructor(rpc_url: string, use_pending: boolean = false) {
    this.rpc_url = rpc_url;
    this.use_pending = use_pending;
  }

  //Network information related

  /** The function that sends the RPC POST request */
  async call(payload: Record<string, any>): Promise<Record<string, any>> {
    if (this.debug) console.log(JSON.stringify(payload));
    const resp = await fetch(this.rpc_url, {
      method: "POST",
      headers: this.headers ?? { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok && this.debug) console.log(await resp.text());
    if (!resp.ok) throw Error(`Request to RPC node failed with status code ${resp.status}`);
    const resp_json = await resp.json();
    if (resp_json.error) throw Error(`RPC node response: ${resp_json.error}`);
    return resp_json;
  }
  /** See https://docs.nano.org/commands/rpc-protocol/#block_count */
  async get_block_count(): Promise<BlockCountRPC> {
    return (await this.call({
      action: "block_count",
    })) as BlockCountRPC;
  }
  /** See https://docs.nano.org/commands/rpc-protocol/#block_info */
  async get_block_info(block_hash: BlockHash): Promise<BlockInfoRPC> {
    return (await this.call({
      action: "block_info",
      hash: block_hash,
      json_block: true,
    })) as BlockInfoRPC;
  }
  /** See https://docs.nano.org/commands/rpc-protocol/#blocks */
  async get_blocks(block_hashes: BlockHash[]): Promise<BlocksRPC> {
    return (await this.call({
      action: "blocks",
      hashes: block_hashes,
      json_block: true,
    })) as BlocksRPC;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#blocks_info */
  async get_blocks_info(block_hashes: BlockHash[]): Promise<BlocksInfoRPC> {
    return (await this.call({
      action: "blocks_info",
      hashes: block_hashes,
      json_block: true,
    })) as BlocksInfoRPC;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#representatives */
  async get_representatives(): Promise<RepresentativesRPC> {
    return (await this.call({
      action: "representatives",
    })) as RepresentativesRPC;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#representatives_online */
  async get_representatives_online<T extends boolean>(weight?: T): Promise<T extends true ? RepresentativesOnlineWeightRPC : RepresentativesOnlineRPC> {
    return (await this.call({
      action: "representatives_online",
      weight: weight ? true : undefined, //better not to include "weight" if false, rather than sending "weight": false
    })) as Promise<T extends true ? RepresentativesOnlineWeightRPC : RepresentativesOnlineRPC>;
  }

  //Account information related

  /** https://docs.nano.org/commands/rpc-protocol/#account_history */
  async get_account_history<T extends boolean>(account: Address, count: number, raw?: T, head?: BlockHash, offset?: number, reverse?: boolean, account_filter?: Address[]): Promise<T extends true ? AccountHistoryRawRPC : AccountHistoryRPC> {
    return (await this.call({
      action: "account_history",
      account,
      count: `${count}`,
      raw: raw ? true : undefined,
      head,
      offset: offset ? `${offset}` : undefined,
      reverse: reverse ? true : undefined,
      account_filter,
    })) as Promise<T extends true ? AccountHistoryRawRPC : AccountHistoryRPC>;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#account_info */
  async get_account_info(account: Address, include_confirmed?: boolean, representative?: boolean, weight?: boolean, pending?: boolean): Promise<AccountInfoRPC> {
    return (await this.call({
      action: "account_info",
      account,
      include_confirmed: include_confirmed ? true : undefined,
      representative: representative ? true : undefined,
      weight: weight ? true : undefined,
      pending: pending ? true : undefined,
    })) as AccountInfoRPC;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#account_balance */
  async get_account_balance(account: Address): Promise<AccountBalanceRPC> {
    return (await this.call({
      action: "account_balance",
      account,
    })) as AccountBalanceRPC;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#accounts_balances */
  async get_accounts_balances(accounts: Address[]): Promise<AccountsBalancesRPC> {
    return (await this.call({
      action: "accounts_balances",
      accounts,
    })) as AccountsBalancesRPC;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#account_representative */
  async get_account_representative(account: Address): Promise<AccountRepresentativeRPC> {
    return (await this.call({
      action: "account_representative",
      account,
    })) as AccountRepresentativeRPC;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#accounts_representatives */
  async get_accounts_representatives(account: Address): Promise<AccountsRepresentativesRPC> {
    return (await this.call({
      action: "accounts_representatives",
      account,
    })) as AccountsRepresentativesRPC;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#account_weight */
  async get_account_weight(account: Address): Promise<AccountWeightRPC> {
    return (await this.call({
      action: "account_weight",
      account,
    })) as AccountWeightRPC;
  }
  //I hate nano node rpc here. I don't want to do the conditional type thing here, so have a union
  /** Keep in mind "threshold" parameter is in raw. https://docs.nano.org/commands/rpc-protocol/#receivable */
  async get_account_receivable(account: Address, count?: number, threshold?: `${number}`, source?: boolean): Promise<AccountReceivableRPC | AccountReceivableThresholdRPC | AccountReceivableSourceRPC> {
    return (await this.call({
      action: this.use_pending ? "pending" : "receivable",
      account,
      count: count ? `${count}` : undefined,
      threshold: threshold ? whole_to_raw(threshold, this.DECIMALS).toString() : undefined,
      source: source ? true : undefined,
    })) as AccountReceivableRPC | AccountReceivableThresholdRPC | AccountReceivableSourceRPC;
  }
  /** Keep in mind "threshold" parameter is in raw. https://docs.nano.org/commands/rpc-protocol/#delegators */
  async get_delegators(account: Address, threshold?: number, count?: number, start?: Address): Promise<DelegatorsRPC> {
    return (await this.call({
      action: "delegators",
      account,
      threshold: threshold ? `${threshold}` : undefined,
      count: count ? `${count}` : undefined,
      start,
    })) as DelegatorsRPC;
  }
  /** https://docs.nano.org/commands/rpc-protocol/#account_weight */
  async get_delegators_count(account: Address): Promise<DelegatorsCountRPC> {
    return (await this.call({
      action: "account_weight",
      account,
    })) as DelegatorsCountRPC;
  }
}

export class RPCWithBackup extends RPC {
  readonly rpc_urls: string[];
  readonly timeout: number;

  /**
   * @param {number} [timeout] Request to RPC timeout, in milliseconds. If RPC request fails or timeouts, tries the next RPC
   */
  constructor(rpc_urls: string[], timeout: number, use_pending: boolean = false) {
    if (rpc_urls.length < 2) throw Error("Must provide at least two RPC URLs");
    super(rpc_urls[0], use_pending);
    this.rpc_urls = rpc_urls;
    this.timeout = timeout;
  }
  async call(payload: Record<string, any>): Promise<Record<string, any>> {
    let i = 0;
    while (true) {
      try {
        const resp = await fetch(this.rpc_urls[i], {
          method: "POST",
          headers: this.headers ?? { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: (AbortSignal as any).timeout(this.timeout), //for old typescript versions
        });
        if (!resp.ok) throw Error(`Request to RPC node failed with status code ${resp.status}`);
        const resp_json = await resp.json();
        if (resp_json.error) throw Error(`RPC node response: ${resp_json.error}`);
        return resp_json;
      } catch (e) {
        //increment (so try next RPC in provided list), if all RPCs exhausted (all failed), throw error
        //typescript says e might not inherit from Error which is technically true, but in this case it always will be
        if (!this.rpc_urls[++i]) throw Error(e instanceof Error ? e.toString() : "RPC call error");
      }
    }
  }
}
