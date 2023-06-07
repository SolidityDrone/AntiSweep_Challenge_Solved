# Token Hacker Challenge
The Token Hacker Challenge is a smart contract that involves retrieving an ERC-721 key token from a hacked wallet on the Ethereum network. The challenge is to be the first person to withdraw the key token from the hacked wallet, which will unlock the Token Hacker Challenge NFT. 
Challenge at url (https://github.com/epieffe/token-hacker-challenge)
## Problem Statement
The Token Hacker Challenge contract contains an ERC-721 key token that is locked inside a hacked wallet. The goal is to retrieve this key token and gain control of the assets stored within the contract. However, there are certain obstacles that make this task challenging.

The hacked wallet is targeted by a sweeper bot, which automatically sweeps any incoming Ether transactions sent to the wallet. This means that simply sending Ether to the wallet in order to secure the NFT is not possible without circumnventing the bot and will lead to a loss of funds.

To overcome this obstacle, the solution utilizes the Flashbots bundle feature. 

By using a bundle, a group of transactions can be executed as a single atomic unit, without being exposed to the public mempool. This allows the solution to execute a series of transactions in a specific order, bypassing the sweeper bot and successfully retrieving the key token.

# Prerequisites
Before running the Token Hacker Challenge solution, ensure that you have the following dependencies installed:

Node.js (LTS version)
npm (Node Package Manager)
Git
Installation
Follow these steps to set up and run the Token Hacker Challenge solution:

# Clone the repository:

```bash
# clone repository
git clone <repository-url>
# change directory 
cd <repository-folder>
# install dependencies from package.json
npm install
```

## Setup your keys 

Edit the .env file in the main directory 
```
VICTIM_KEY="victim-private-key"
HELPER_KEY="helper-private-key"
```


Update the Alchemy API URL:

In index.ts replace {YOUR_ALCHEMY_AUTH_KEY} with your Alchemy API key. 
You can use a different provider like infura or quicknode.

## Build your .js 
since we are using typescript once we're done writing code we will need to run
```bash
tsc index.ts
```
This will generate an index.js file. 
To launch this script simply run:

```bash
node index.js
``` 

# Note
This code won't run and just works as an example. Since it has been solved already, the same code will not work as trasnferFrom function will revert.
You can use this code as a reference to understand how bundle works.
You can learn more about flashbots and bundles at (https://www.flashbots.net/)




