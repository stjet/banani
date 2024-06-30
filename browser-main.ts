import * as util from "./util";
import * as rpc from "./rpc";
import * as wallet from "./wallet";
import * as work from "./work";

//for browsers or whatever
window.banani = { ...util, ...rpc, ...wallet, ...work };
