import * as nacl from "./tweetnacl_mod";
import blake2b from "blake2b";

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

//assumes the hex length is multiple of 2
export function hex_to_uint8array(hex: string): Uint8Array {
  hex = hex.toUpperCase();
  let uint8array: Uint8Array = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < Math.floor(hex.length / 2); i++) {
    uint8array[i] = HEX_CHARS.indexOf(hex[i * 2]) * 16 + HEX_CHARS.indexOf(hex[i * 2 + 1]);
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

//

// whole and raw related

const BANANO_DECIMALS: number = 29;

export type Whole = `${number}`; //number can include non-base-10 formats... but whatever, we can assume users will pass in only base-10 because they are normal for the most part

/** Turn whole Bananos (string) into raw Bananos (BigInt) */
export function whole_to_raw(whole: Whole, decimals = BANANO_DECIMALS): BigInt {
  let raw: BigInt;
  if (whole.includes(".")) {
    let parts = whole.split(".");
    if (0 > (decimals - parts[1].length)) throw Error(`Too many decimals, cannot exceed ${decimals}`)
    raw = BigInt(parts[0]) * (BigInt(10) ** BigInt(decimals)) + BigInt(parts[1]) * (BigInt(10) ** BigInt(decimals - parts[1].length));
  } else {
    raw = BigInt(whole) * (BigInt(10) ** BigInt(decimals));
  }
  return raw;
}

/** Turn raw Bananos (BigInt) into whole Bananos (string) */
export function raw_to_whole(raw: BigInt, decimals = BANANO_DECIMALS): Whole {
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

export function a(b) {
  return blake2b(64).update(b).digest();
}

export function get_public_key_from_private_key(private_key: string): string {
  return uint8array_to_hex(nacl.sign.keyPair.fromSecretKey(hex_to_uint8array(private_key)).publicKey);
}

//

