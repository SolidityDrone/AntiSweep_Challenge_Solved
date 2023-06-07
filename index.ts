import { BigNumber, providers, Wallet, utils } from "ethers";
import {
    FlashbotsBundleProvider,
    FlashbotsBundleResolution,
} from "@flashbots/ethers-provider-bundle";
import { exit } from "process";

// configure dotenv so we can access variables in our .env file
require('dotenv').config();

// url to the flashbots relay
const FLASHBOTS_URL = "https://relay.flashbots.net";
// token address of the ERC721 contract of the token we need to pull
const TOKEN_ADDRESS = "0xcf8F4Ac2F895C7241e90D8968C574AA0C805cA75";

const main = async () => {
    // check if both keys are available from .env
    if (
        process.env.VICTIM_KEY === undefined ||
        process.env.HELPER_KEY === undefined
    ) {
        console.error("BOTH KEYS ARE REQUIRED!");
        exit(1);
    }
    // initialize our provider. You can use Infura or whatever you want
    const provider = new providers.JsonRpcProvider(
        "https://eth-mainnet.g.alchemy.com/v2/{YOUR_ALCHEMY_AUTH_KEY}"
    );

    const authSigner = Wallet.createRandom();

    const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider,
        authSigner,
        FLASHBOTS_URL
    );

    // Declare actors wallets 

    const victim = new Wallet(process.env.VICTIM_KEY).connect(provider);
    const helper = new Wallet(process.env.HELPER_KEY).connect(provider);
    
    // declare IERC721 interface 
    const IERC721_ABI = require("./IERC721.json");
    const IERC721 = new utils.Interface(IERC721_ABI);

    // We estimate gas units consumed by transferFrom
    // Note: this function will revert as the challenge is solved and 
    // the victim dosen't hold tokenId 56 anymore.
    const estimatedTransferGasConsumption = await provider.estimateGas({
        to: TOKEN_ADDRESS,
        data: IERC721.encodeFunctionData("transferFrom", [
            victim.address,
            helper.address,
            56
        ]),
    });

    // Check gas price according to your provider 
    const currentGasPrice = await provider.getGasPrice();
    // Estimate the value that we will need to send to victim in order to pay for gas fees
    const estimatedFinalPrice = currentGasPrice.mul(estimatedTransferGasConsumption);


    console.log("Estimated gas limit: ", estimatedTransferGasConsumption.toString());
    console.log("Victim eth required to run transaction would be roughly: ", estimatedFinalPrice .toString());

    // Whenever we get a new block we will run:  
    provider.on("block", async (blockNumber) => {

        console.log("current block: ", blockNumber);
        const targetBlockNumber = blockNumber + 1;

        const response = await flashbotsProvider.sendBundle(
            [
                {
                    signer: helper,
                    transaction: {
                        chainId: 1,
                        to: victim.address,
                        type: 2,
                        gasPrice: currentGasPrice,
                        value: estimatedFinalPrice ,
                        maxFeePerGas: utils.parseUnits("3", "gwei"),
                        maxPriorityFeePerGas: utils.parseUnits("2", "gwei")
                    },
                },
                {
                    signer: victim,
                    transaction: {
                        chainId: 1,
                        type: 2,
                        to: TOKEN_ADDRESS,
                        data: IERC721.encodeFunctionData("transferFrom", [
                            victim.address,
                            helper.address,
                            56,
                        ]),
                        gasPrice: currentGasPrice,
                        maxFeePerGas: utils.parseUnits("3", "gwei"),
                        maxPriorityFeePerGas: utils.parseUnits("2", "gwei")
                    },
                },

            ],
            targetBlockNumber
        );
            
        if ("error" in response) {
            console.log(response.error.message);
            return;
        }

        const resolution = await response.wait();
        if (resolution === FlashbotsBundleResolution.BundleIncluded) {
            console.log(`Congrats, included in ${targetBlockNumber}`);
            exit(0);
        } else if (
            resolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion
        ) {
            console.log(`Not included in ${targetBlockNumber}`);
        } else if (resolution === FlashbotsBundleResolution.AccountNonceTooHigh) {
            console.log("Nonce too high");
            exit(1);
        }
    });
};

main();
