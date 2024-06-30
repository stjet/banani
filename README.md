# Banani

> ~~how to buy banani from beatrice~~
> how to install banani on react.js

Banani is a library for the Banano cryptocurrency that will support sending, receiving, changing rep, RPC calls, message signing, wallet management, etc. It aims to be a more powerful and sensible version of @bananocoin/bananojs. Banani takes heavy inspiration from the Python [bananopie](https://github.com/stjet/bananopie) (which I also wrote), which in turn takes some inspiration from my experiences with ethers.js.

**Please report any bugs or request features by opening an Github issue.** You can ask for help or ask questions in the #frankensteins-lab channel of the Banano discord and people will be typically be eager to assist if they can.

## Installing

```
npm install banani
```

Embedding in the browser is easy to - just download and add `banani-browser.js` to your website:

```html
<script src="/path/to/banani-browser.js"></script>
```

Take a look in `browser_test/index.html` for an example.

## Documentation

The docs are hosted at https://banani.prussia.dev (can also be accessed at https://stjet.github.io/banani/).

## Examples

Banani allows you to send, receive, and change representative. If you are using Banani on the web, replace `banani` with `window.banani`.

```js
const rpc = new banani.RPC("https://kaliumapi.appditto.com/api");

console.log(await rpc.get_block_count());

const wallet = new banani.Wallet(rpc, process.env.seed);

const zero_index_address = wallet.address;

wallet.index = 1;

const send_hash = await wallet.send(zero_index_address, "1"); //send 1 banano

wallet.index = 0;

await wallet.receive(send_hash); //receive the bananos we just send (can also do `await wallet.receive_all()`)

await wallet.change_rep("placeholder");
```

Banani also comes with some useful utilities, and message signing:

```js
const rpc = new banani.RPC("https://kaliumapi.appditto.com/api");
const random_wallet = banani.Wallet.gen_random_wallet(rpc);

console.log(banani.whole_to_raw("4.20069") === 420069000000000000000000000000n);
console.log(random_wallet.sign_message("test message\ntest test"));
```

## Contributing

```
git clone https://github.com/stjet/banani.git
cd banani
...
<make your changes with your favourite editor>
...
npm run build
```

Then commit and push your changes.

In most cases, you will only need to touch the typescript (`.ts`) files.

## Work Generation

Though Kalium's public work will generate work for you, it is suggested that you generate your own work for the following reasons:

- it is relatively "easy" (in terms of computation) to do
- if Boompow goes offline (as it has done in the past), many Banano services will go down, which is not great for users and is not a very decentralized or resilient way to make your thing

Unrelated, do remember that Nano has harder work thresholds than Banano.

## Using for Nano instead of Banano

The main differences between Nano and Banano; or at least those relevant to a library like this, are the different amount of decimals. So, when creating a `Wallet` with banani, make sure to do `my_rpc.DECIMALS = 31` otherwise your sends will be off by two magnitudes which is bad.

Also, a different preamble should be used for message signing.

## Dependencies

Banani has two external dependencies, tweetnacl and blake2b. Blake2b probably has its own dependencies, but I haven't checked.

Tweetnacl is not listed as a dependency in the package.json because it has been modified to use blake2b for the hashing algorithm. So, a modified version of it is distributed directly along with the package (see `tweetnacl_mod.js`). Clone the repo and run `npm run cryptodiff` to see the changes made from regular tweetnacl.

Banani also has many dev dependencies for contributing/developing the package (see the "Contributing" section), but they are not needed for regular users of the package.

## Todo

- More extensive testing
- Example work generating function
