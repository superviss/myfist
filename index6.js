const bip39 = require('bip39');
const Wallet = require('ethereumjs-wallet');
const fs = require('fs');
const { Network, Alchemy } = require("alchemy-sdk");
const crypto = require('crypto');

const batchSize = 100;
let totalCheckedAddresses = 0;
let totalSavedAddresses = 0;

const settings = {
    apiKey: "UzfqCBDoto_9m4sc7J5gRl48IL8nAfz1",
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(settings);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSeedPhrase() {
    const entropy = crypto.randomBytes(16); // 16 bytes of entropy
    return bip39.entropyToMnemonic(entropy.toString('hex'));
}

let numberOfPossibleSeedPhrases = batchSize;
let usedSeedPhrases = 0;

function getNextAddress() {
    const seedPhrase = generateSeedPhrase();
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const hdwallet = Wallet.hdkey.fromMasterSeed(seed);
    const walletHDPath = "m/44'/60'/0'/0/0";
    const wallet = hdwallet.derivePath(walletHDPath).getWallet();
    const address = `0x${wallet.getAddress().toString('hex')}`;

    return { seedPhrase, address, hdwallet };
}

function saveBatchResultsToFile(batchResults) {
    if (batchResults.length === 0) {
        return;
    }

    const content = batchResults.map(result => {
        return `Seed: ${result.seedPhrase}\nAddress: ${result.address}\nTxCount: ${result.txCount}\nHD Wallet: ${JSON.stringify(result.hdwallet)}\n\n`;
    }).join('\n');

    fs.appendFile('output.txt', content, (err) => {
        if (err) throw err;
        console.log(`Saved ${batchResults.length} addresses to file successfully!\n`);
    });
}

async function runAsync() {
    while (true) {
        const batchResults = [];

        for (let i = 0; i < batchSize; i++) {
            const { seedPhrase, address, hdwallet } = getNextAddress();
            totalCheckedAddresses++;

            try {
                const txCount = await alchemy.core.getTransactionCount(address);

                if (txCount !== undefined) {
                    console.log(`Seed: ${seedPhrase}`);
                    console.log(`Address: ${address}`);
                    console.log(`TxCount: ${txCount}`);

                    if (txCount !== 0) {
                        console.log("Saving to file...\n");
                        batchResults.push({ seedPhrase, address, txCount, hdwallet });
                        totalSavedAddresses++;
                    } else {
                        console.log("Not creating a new address.\n");
                    }
                } else {
                    console.log("API did not return a valid value.\n");
                }
            } catch (error) {
                console.error("Error fetching data from API:", error.message);
            }
        }

        saveBatchResultsToFile(batchResults);
        console.log(`Total checked addresses: ${totalCheckedAddresses}`);
        console.log(`Total saved addresses: ${totalSavedAddresses}\n`);
        await sleep(1000);
    }
}

runAsync();
