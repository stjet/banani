import * as banani from "banani";
import * as fs from "fs";

let rpc = new banani.RPC("https://kaliumapi.appditto.com/api");
console.log(rpc.rpc_url);

let test_seed = fs.readFileSync("./.secret", "utf-8").trim();

let wallet = new banani.Wallet(rpc, test_seed);

wallet.index = 2; //3rd account

console.log(wallet.address);

wallet.send("ban_1o7ija3mdbmpzt8qfnck583tn99fiupgbyzxtbk5h4g6j57a7rawge6yzxqp", "1.001");

//

