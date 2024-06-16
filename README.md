# Banani

> ~~how to buy banani from beatrice~~
> how to install banani on react.js

Banani is a library for the Banano cryptocurrency that will support sending, receiving, changing rep, RPC calls, message signing, wallet management, etc. It aims to be a more powerful and sensible version of @bananocoin/bananojs. Banani takes heavy inspiration from [bananopie](https://github.com/stjet/bananopie) (which I also wrote), which in turn takes some inspiration from my experiences with ethers.js.

The docs are hosted at https://banani.prussia.dev.

Currently being written, and heavy work in progress.

## Examples

## Documentation

## Contributing

```
git clone https://github.com/stjet/banani.git
cd banani
...
<make your changes>
...
npm run build
```

Then commit and push your changes.

In most cases, you will only need to touch the typescript (`.ts`) files.

## Work Generation
Though Kalium's public work will generate work for you, it is suggested that you generate your own work for the following reasons:
- it is relatively "easy" (in terms of computation) to do
- if Boompow goes offline (as it has done in the past), many Banano services will go down, which is not great for users and is not a very decentralized or resilient way to make your thing

## Dependencies
Banani has two external dependencies, tweetnacl and blake2b. Blake2b probably has its own dependencies, but I haven't checked.

Tweetnacl is not listed as a dependency in the package.json because it has been modified to use blake2b for the hashing algorithm. So, a modified version of it is distributed directly along with the package (see `tweetnacl_mod.js`). Clone the repo and run `npm run cryptodiff` to see the changes made from regular tweetnacl.

Banani also has many dev dependencies for contributing/developing the package (see the "Contributing" section), but they are not needed for regular users of the package.

