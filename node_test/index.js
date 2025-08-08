import * as banani from "../main.js";
//import * as banani from "banani";
import * as fs from "fs";

let rpc_backup = new banani.RPCWithBackup(["https://doesnotexist239932093293854758.com", "https://kaliumapi.appditto.com/api"], 3000);

console.log(await rpc_backup.get_block_count());

let rpc = new banani.RPC("https://kaliumapi.appditto.com/api");
//rpc.debug = true
console.log(rpc.rpc_url);

console.log(await rpc.get_block_count());

let random_wallet = banani.Wallet.gen_random_wallet(rpc);
let private_key_account = new banani.PrivateKeyAccount(rpc, random_wallet.private_key);

console.log("random", random_wallet.address, random_wallet.address === private_key_account.address);

const TEST_MESSAGE = "test message\ntest test";

const sig = random_wallet.sign_message(TEST_MESSAGE);
console.log("sig", sig);
console.log("sig verify 1", banani.verify_signed_message(random_wallet.address, TEST_MESSAGE, sig));
console.log("sig verify 2 (should be false)", banani.verify_signed_message(banani.Wallet.gen_random_wallet(rpc).address, TEST_MESSAGE, sig));

console.log("verify block hash test", banani.verify_block_hash(banani.get_public_key_from_address("ban_1d59mzcc7yyuixyzc7femupc76yjsuoko79mm7y8td461opcpgiphjxjcje7"), "F5F4EBEC4DA188FD1C8F3848D5D7140E135D8DE79C4523148E70A737730740D370D67A9570DF91E6AC946D0DE81830F3144FE4192528A0D5A7283EF06B316505", "26722EF85256481A358A538D6D0EDA1B8B8F337AD4F9CB58C41BBC44949FDA21"));

console.log("running work test (may take a while)")
console.log("work test", (await new banani.SlowJavascriptWorkProvider().request_work("B7FBEF33567E37E04E772C473CCED4FA9245CC7A4C1BDE8A2576F7384E7919E1")) == "0000000000423B3B");

const test_seed = fs.readFileSync("./.secret", "utf-8").trim();

let wallet = new banani.Wallet(rpc, test_seed);

const z_address = wallet.address; //0 index

console.log("hist len", (await rpc.get_account_history(z_address, -1)).history.length);

console.log("sig 2", wallet.sign_message(TEST_MESSAGE));

wallet.index = 2; //3rd account
const t_address = wallet.address;
console.log(wallet.address);
//console.log(await wallet.receive("03EEE28C2CB5CA0552BF31A60A797929920FDE044B5E021B8CEC16F57278F79A"));
console.log("send 1");
const send_hash = await wallet.send(z_address, "1.001");

wallet.index = 0;
console.log("receive 1");
await wallet.receive(send_hash);
console.log("send 2");
await wallet.send(t_address, "0.1");
console.log("send 3");
await wallet.send_fixed_final_bal(t_address, "0.500201");
console.log("send 4");
await wallet.send_all(t_address);

wallet.index = 2;
console.log("receive 2");
console.log(await wallet.receive_all());

await wallet.change_rep("ban_3p3sp1ynb5i3qxmqoha3pt79hyk8gxhtr58tk51qctwyyik6hy4dbbqbanan");
