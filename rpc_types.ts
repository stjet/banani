export type AddressPrefix = "ban_" | "nano_";
export type Address = `${AddressPrefix}${string}`;

/** 32 byte block hash represented as 64 char hexadecimal */
export type BlockHash = string;

export type BlockStateChangeTypes = "send" | "receive";
export type BlockBasicTypes = BlockStateChangeTypes | "change";
export type BlockSubtype = BlockBasicTypes | "epoch";
export type BlockLegacyTypes = BlockBasicTypes | "open";
export type BlockAllTypes = BlockLegacyTypes | "state";

export interface BlockNoSignature {
  type: BlockAllTypes;
  account: Address;
  previous: BlockHash;
  representative: Address;
  balance: `${number}`;
  link: BlockHash;
  link_as_account?: Address;
}

export interface Block extends BlockNoSignature {
  signature: string;
  work?: string;
}

export interface BlockCountRPC {
  count: `${number}`;
  unchecked: `${number}`;
  cemented?: `${number}`;
}

export interface BlockInfoRPC {
  block_account: Address;
  amount: `${number}`;
  balance: `${number}`;
  height: `${number}`;
  timestamp: `${number}`;
  contents: Block;
  //v19 or newer only
  confirmed?: `${boolean}`;
  subtype?: BlockSubtype; //for state blocks only
  //v23 or newer only
  successor?: `${string}`;
}

export interface BlocksRPC {
  blocks: Record<BlockHash, Block>;
}

export interface BlocksInfoRPC {
  blocks: Record<BlockHash, BlockInfoRPC>;
}

export interface RepresentativesRPC {
  representatives: Record<Address, `${number}`>;
}

export interface RepresentativesOnlineRPC {
  representatives: Address[];
}

export interface RepresentativesOnlineWeightRPC {
  representatives: Record<Address, { weight: `${number}` }>;
}

export interface AccountHistoryBlock {
  type: BlockStateChangeTypes;
  account: Address;
  amount: `${number}`;
  local_timestamp: `${number}`;
  height: `${number}`;
  hash: BlockHash;
  confirmed: boolean;
}

export interface AccountHistoryRawBlock {
  account: Address;
  amount: `${number}`;
  amount_decimal: `${number}`;
  balance: `${number}`;
  balance_decimal: `${number}`;
  confirmed: `${boolean}`;
  hash: BlockHash;
  height: `${number}`;
  link: BlockHash;
  local_timestamp: `${number}`;
  previous: BlockHash;
  representative: Address;
  signature: string;
  subtype: BlockSubtype;
  type: BlockAllTypes;
  work: string;
}

export interface AccountHistoryRPC {
  account: Address;
  history: AccountHistoryBlock[];
  previous?: BlockHash;
}

export interface AccountHistoryRawRPC {
  account: Address;
  history: AccountHistoryRawBlock[];
  previous?: BlockHash;
}

export interface AccountInfoRPC {
  frontier: BlockHash;
  open_block: BlockHash;
  representative_block: BlockHash;
  balance: `${number}`;
  modified_timestamp: `${number}`;
  block_count: `${number}`;
  account_version: `${number}`;
  confirmation_height?: `${number}`;
  confirmation_height_frontier?: BlockHash;
  representative?: Address;
  weight?: `${number}`;
  pending?: `${number}`;
  receivable?: `${number}`;
  confirmed_balance?: `${number}`;
  confirmed_height?: `${number}`;
  confirmed_frontier?: BlockHash;
  confirmed_representative?: Address;
  confirmed_receivable?: `${number}`;
  confirmed_pending?: `${number}`;
}

export interface AccountBalanceRPC {
  balance: `${number}`;
  pending: `${number}`;
  receivable?: `${number}`;
}

export interface AccountsBalancesRPC {
  balances: Record<Address, AccountBalanceRPC>;
}

export interface AccountRepresentativeRPC {
  representative: Address;
}

export interface AccountsRepresentativesRPC {
  representatives: Record<Address, Address>;
}

export interface AccountWeightRPC {
  weight: `${number}`;
}

export interface AccountReceivableRPC {
  blocks: BlockHash[];
}

//doesn't happen if threshold is "0" for some reason. why, nano node rpc...
export interface AccountReceivableThresholdRPC {
  blocks: Record<BlockHash, `${number}`>;
}

export interface AccountReceivableSourceRPC {
  blocks: Record<
    BlockHash,
    {
      amount: `${number}`;
      source: Address;
    }
  >;
}

export interface DelegatorsRPC {
  delegators: Record<Address, `${number}`>;
}

export interface DelegatorsCountRPC {
  count: `${number}`;
}

//
