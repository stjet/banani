import * as util from "./util";
import * as rpc from "./rpc";
import * as wallet from "./wallet";

//for browsers or whatever
window.banani = { ...rpc, ...wallet, ...util };

