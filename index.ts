import { BigNumber, providers, Wallet, utils } from "ethers";
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
        process.env.VICTIM_KEY === undefined ||
        process.env.HELPER_KEY === undefined
    ) {
        console.error("BOTH KEYS ARE REQUIRED!");
        exit(1);
    }

    const provider = new providers.JsonRpcProvider(
        "https://eth-mainnet.g.alchemy.com/v2/{YOUR_ALCHEMY_AUTH_KEY}"
    );

    const authSigner = Wallet.createRandom();

    const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider,
        authSigner,
        FLASHBOTS_URL
    );



    const victim = new Wallet(process.env.VICTIM_KEY).connect(provider);
    const helper = new Wallet(process.env.HELPER_KEY).connect(provider);

    const IERC721_ABI = require("./IERC721.json");
    const IERC721 = new utils.Interface(IERC721_ABI);


    const estimatedTransferGasConsumption = await provider.estimateGas({
        to: TOKEN_ADDRESS,
        data: IERC721.encodeFunctionData("transferFrom", [
            victim.address,
            helper.address,
            56
        ]),
    });

    const estimatedFinalPrice = (await provider.getGasPrice()).mul(estimatedTransferGasConsumption);

    const currentGasPrice = await provider.getGasPrice();

    const finalPrice = estimatedFinalPrice; /*.add(ethers.utils.parseEther('0.000'));*/

    
    console.log("Estimated gas limit: ", estimatedTransferGasConsumption.toString());
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