import * as nacl from "./tweetnacl_mod";
import blake2b from "blake2b";
import type { AddressPrefix, Address, BlockNoSignature, BlockHash } from "./rpc_types";

const PREAMBLE = "0000000000000000000000000000000000000000000000000000000000000006";
const MESSAGE_PREAMBLE = "62616E616E6F6D73672D"; //bananomsg-

// byte related

const HEX_CHARS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];

//sigh... https://www.prussiafan.club/posts/hex-to-bytes-and-back/
export function uint8array_to_hex(uint8array: Uint8Array): string {
  let hex: string = "";
  for (let i = 0; i < uint8array.length; i++) {
    hex += HEX_CHARS[Math.floor(uint8array[i] / 16)] + HEX_CHARS[uint8array[i] % 16];
  }
  return hex;
}

//does not assume the hex length is multiple of 2
export function hex_to_uint8array(hex: string): Uint8Array {
  hex = hex.toUpperCase();
  let uint8array: Uint8Array = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < Math.floor(hex.length / 2); i++) {
    uint8array[i] = HEX_CHARS.indexOf(hex[i * 2]) * 16 + HEX_CHARS.indexOf(hex[i * 2 + 1]);
  }
  if ((hex.length / 2) % 1 !== 0) {
    uint8array[uint8array.length - 1] = HEX_CHARS.indexOf(hex[hex.length - 1]) * 16;
  }
  return uint8array;
}

export function int_to_uint8array(int: number, len: number): Uint8Array {
  let uint8array: Uint8Array = new Uint8Array(len);
  for (let i = 1; i <= len; i++) {
    if (i === 1) {
      uint8array[len - i] = int % (16 ** 2);
    } else {
      let subbed_int = int;
      for (let j = i - 1; j > 0; j--) {
        subbed_int -= uint8array[len - j] * (16 ** (2 * (j - 1)));
      }
      uint8array[len - i] = Math.floor((subbed_int) / (16 ** (2 * (i - 1))));
    }
  }
  return uint8array;
}

const BASE32_CHARS = ["1", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "m", "n", "o", "p", "q", "r", "s", "t", "u", "w", "x", "y", "z"];
//const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567".split("");

//this works for normal base32 (with the exception of the second to last character) but not for nano??????
//ok, so in addition to the different character set,** you need to pad 4 bits at the front (with 0)** so no left over bits exist. we will pad before this function is called
//now officially a bitwise operator enthusiast
export function uint8array_to_base32(uint8array: Uint8Array): string {
  let base32: string = "";
  for (let i = 0; i < Math.floor(uint8array.length * 8 / 5); i++) {
    let bitn = i * 5; //bit #
    let bytn = Math.floor(bitn / 8); //byte #
    let bits = bitn % 8; //bit start (in the byte)
    let b32in: number; //base32 chars array index (5 bit integer)
    let r = 8 - bits;
    if (r >= 5) {
      b32in = uint8array[bytn] >> (r - 5) & 31; //rightshift to get rid of extra bits on the right, then & 31 to get it down to 5 bits
    } else {
      let n = 5 - r; //amount of bits to get from the next byte
      b32in = (uint8array[bytn] << n & 31) + (uint8array[bytn + 1] >> (8 - n) & (2 ** (8 - n) - 1)); //first part: left shift to get the bits from the current byte in the right position, then & 31 to get it down to 5 bits. second part: get remaining bits from front of the next byte by rightshifting (get rid of extra bits on the right) and then again doing & to get it down to the appropriate amount of bits
    }
    base32 += BASE32_CHARS[b32in];
  }
  //leftover if applicable (this is wrong), but for address generation, there shouldn't be any
  //let lo = uint8array.length * 8 % 5; //leftover
  //if (lo > 0) base32 += BASE32_CHARS[uint8array[uint8array.length - 1] << (5 - lo) & 31];
  return base32;
}

function int_to_binary(int: number, bits: number): string {
  let binary = "";
  let r = int;
  for (let i = 0; i < bits; i++) {
    if (r >= 2 ** (bits - 1 - i)) {
      binary += "1";
      r -= 2 ** (bits - 1 - i);
    } else {
      binary += "0";
    }
  }
  return binary;
}

function binary_to_int(binary: string): number {
  let int = 0;
  for (let i = 0; i < binary.length; i++) {
    int += binary[i] === "1" ? 2 ** (binary.length - 1 - i) : 0;
  }
  return int;
}

//I don't feel like using bitwise operators for this. might need to use up to 3 bytes, too much work
//expects length * 5 to be multiple of 8
export function base32_to_uint8array(base32: string): Uint8Array {
  let binary = base32.split("").map((c) => int_to_binary(BASE32_CHARS.indexOf(c), 5)).join("");
  let uint8array = new Uint8Array(Math.ceil(base32.length * 5 / 8));
  for (let i = 0; i < uint8array.length; i++) {
    uint8array[i] = binary_to_int(binary.slice(i * 8, i * 8 + 8));
  }
  return uint8array;
}

export function utf8_to_uint8array(utf8: string): Uint8Array {
  return (new TextEncoder()).encode(utf8);
}

//

// whole and raw related

const BANANO_DECIMALS: number = 29;

/** Does NOT mean whole number, can be decimal like "4.2001". Use instead of regular number since those lose precision when decimal */
export type Whole = `${number}`; //number can include non-base-10 formats... but whatever, we can assume users will pass in only base-10 because they are normal for the most part

/** Turn whole Bananos (string) into raw Bananos (bigint) */
export function whole_to_raw(whole: Whole, decimals = BANANO_DECIMALS): bigint {
  let raw: bigint;
  if (whole.includes(".")) {
    let parts = whole.split(".");
    if (0 > (decimals - parts[1].length)) throw Error(`Too many decimals, cannot exceed ${decimals}`)
    raw = BigInt(parts[0]) * (BigInt(10) ** BigInt(decimals)) + BigInt(parts[1]) * (BigInt(10) ** BigInt(decimals - parts[1].length));
  } else {
    raw = BigInt(whole) * (BigInt(10) ** BigInt(decimals));
  }
  return raw;
}

/** Turn raw Bananos (bigint) into whole Bananos (string) */
export function raw_to_whole(raw: bigint, decimals = BANANO_DECIMALS): Whole {
  const raw_string: string = raw.toString();
  let whole_string: string;
  if (raw_string.length > decimals) {
    whole_string = raw_string.slice(0, -decimals) + "." + raw_string.slice(-decimals);
  } else {
    let r: number = decimals - raw_string.length;
    whole_string = "0." + "0".repeat(r > 0 ? r : 0) + raw_string;
  }
  //truncate any extra zeroes
  let cl: number = whole_string.length;
  for (let c = 0; c < cl; c++) {
    if (whole_string.slice(-1) === "0" || whole_string.slice(-1) === ".") {
      whole_string = whole_string.slice(0, -1);
    }
  }
  return whole_string as Whole;
}

// crypto related

export function get_private_key_from_seed(seed: string, index: number): string {
  //index is 4 bytes
  return blake2b(32).update(hex_to_uint8array(seed)).update(int_to_uint8array(index, 4)).digest("hex");
}

export function get_public_key_from_private_key(private_key: string): string {
  return uint8array_to_hex(nacl.sign.keyPair.fromSecretKey(hex_to_uint8array(private_key)).publicKey);
}

export function get_address_from_public_key(public_key: string, prefix: AddressPrefix = "ban_"): Address {
  //the previously mentioned padding the front with 4 bits
  let encoded = uint8array_to_base32(hex_to_uint8array(`0${public_key}`));
  //skip byte length assertions
  let hashed = uint8array_to_base32(blake2b(5, null, null, null, true).update(hex_to_uint8array(public_key)).digest().reverse());
  return `ban_${encoded}${hashed}`;
}

export function get_public_key_from_address(address: Address): string {
  //extract just the public key portion
  let b = base32_to_uint8array(address.split("_")[1].slice(0, 52));
  b[b.length - 1] = b[b.length - 1] * 16; //this is a bug fix
  //remove padding 0 added when encoding to address, remove trailing zero added by the code
  return uint8array_to_hex(b).slice(1, -1);
}

export function hash_block(block: BlockNoSignature): string {
  let padded_balance = BigInt(block.balance).toString(16).toUpperCase();
  //balance needs to be 16 bytes
  while (padded_balance.length < 32) {
    padded_balance = "0" + padded_balance;
  }
  return blake2b(32)
    .update(hex_to_uint8array(PREAMBLE))
    .update(hex_to_uint8array(get_public_key_from_address(block.account)))
    .update(hex_to_uint8array(block.previous))
    .update(hex_to_uint8array(get_public_key_from_address(block.representative)))
    .update(hex_to_uint8array(padded_balance))
    .update(hex_to_uint8array(block.link))
    .digest("hex");
}

export function sign_block_hash(private_key: string, block_hash: BlockHash): string {
  return uint8array_to_hex(nacl.sign.detached(hex_to_uint8array(block_hash), hex_to_uint8array(private_key)));
}

/** Make sure the alleged signature for a block hash is valid */
export function verify_block_hash(public_key: string, signature: string, block_hash: BlockHash): boolean {
  return nacl.sign.detached.verify(hex_to_uint8array(block_hash), hex_to_uint8array(signature), hex_to_uint8array(public_key));
}

/** sign message by constructing a dummy block with the message (why not just sign the message itself instead of putting it in a dummy block? ledger support). This is already the standard across Banano services and wallets which support signing so please don't invent your own scheme
* @return {string} The signature in hex
*/
export function sign_message(private_key: string, message: string, preamble=MESSAGE_PREAMBLE): string {
  //construct the dummy block
  const dummy32 = "0".repeat(64);
  let dummy_block: BlockNoSignature = {
    type: "state",
    account: get_address_from_public_key(get_public_key_from_private_key(private_key)),
    previous: dummy32,
    //utf8_to_uint8array not implemented
    representative: get_address_from_public_key(uint8array_to_hex(blake2b(32).update(hex_to_uint8array(preamble)).update(utf8_to_uint8array(message)).digest())),
    balance: "0",
    link: dummy32,
    link_as_account: get_address_from_public_key(dummy32),
  };
  return sign_block_hash(private_key, hash_block(dummy_block));
}

//

