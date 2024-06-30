//import * as banani from "../main.js"
import * as banani from "banani";
import * as fs from "fs";

let rpc = new banani.RPC("https://kaliumapi.appditto.com/api");
//rpc.debug = true
console.log(rpc.rpc_url);

console.log(await rpc.get_block_count());

let random_wallet = banani.Wallet.gen_random_wallet(rpc);

console.log("random", random_wallet.address);
console.log("sig", random_wallet.sign_message("test message\ntest test"));

let test_seed = fs.readFileSync("./.secret", "utf-8").trim();

let wallet = new banani.Wallet(rpc, test_seed);

let z_address = wallet.address; //0 index

console.log("hist len", (await rpc.get_account_history(z_address, -1)).history.length);

wallet.index = 2; //3rd account
let t_address = wallet.address;
console.log(wallet.address);
//console.log(await wallet.receive("03EEE28C2CB5CA0552BF31A60A797929920FDE044B5E021B8CEC16F57278F79A"));
console.log("send 1");
let send_hash = await wallet.send(z_address, "1.001");

wallet.index = 0;
console.log("receive 1");
await wallet.receive(send_hash);
console.log("send 2");
await wallet.send(t_address, "0.1");
console.log("send 3");
await wallet.send_all(t_address);

wallet.index = 2;
console.log("receive 2");
console.log(await wallet.receive_all());

await wallet.change_rep("ban_3p3sp1ynb5i3qxmqoha3pt79hyk8gxhtr58tk51qctwyyik6hy4dbbqbanan");

//
