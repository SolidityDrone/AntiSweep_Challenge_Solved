import { ethers, BigNumber, providers, Wallet, utils, Transaction } from "ethers";
import {
    FlashbotsBundleProvider,
    FlashbotsBundleResolution,
} from "@flashbots/ethers-provider-bundle";
import { exit } from "process";

require('dotenv').config();

const FLASHBOTS_URL = "https://relay.flashbots.net";
const TOKEN_ADDRESS = "0xcf8F4Ac2F895C7241e90D8968C574AA0C805cA75";

const main = async () => {
    if (
        process.env.HACKED_KEY === undefined ||
        process.env.HELPER_KEY === undefined
    ) {
        console.error("NO KEYS");
        exit(1);
    }

    const provider = new providers.JsonRpcProvider(
        "https://eth-mainnet.g.alchemy.com/v2/JUtD4J7cgzqW4ATc7Y4APKJ6aPk0vWCm"
    );

    const authSigner = Wallet.createRandom();

    const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider,
        authSigner,
        FLASHBOTS_URL
    );



    const victim = new Wallet(process.env.HACKED_KEY).connect(provider);
    const helper = new Wallet(process.env.HELPER_KEY).connect(provider);
    const IERC721ABI = require("./IERC721.json");
    const iface = new utils.Interface(IERC721ABI);

  
    const estimatedGasLimit = await provider.estimateGas({
        to: TOKEN_ADDRESS,
        data: iface.encodeFunctionData("transferFrom", [
            victim.address,
            helper.address,
            56
        ]),
    });

    const estimatedFinalPrice = (await provider.getGasPrice()).mul(estimatedGasLimit);

    const finalPrice = estimatedFinalPrice.add(ethers.utils.parseEther('0.001'));
    const currentGasPrice = await provider.getGasPrice();
    console.log("Estimated gas limit: ", estimatedGasLimit.toString());
    console.log("Final price should be roughly: ", finalPrice.toString());

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
                        value: finalPrice,
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
                        data: iface.encodeFunctionData("transferFrom", [
                            victim.address,
                            helper.address,
                            56,

                        ]),
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