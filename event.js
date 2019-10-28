// Javascript Ethereum API Library
const ethers = require("ethers");

const sleep = require("./scripts/helpers/sleep.js").sleep;

// ENV VARIABLES
require("dotenv").config();
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
console.log(
  `\n\t\t env variables configured: ${DEV_MNEMONIC !== undefined &&
    INFURA_ID !== undefined}`
);

// Setting up Provider and Signer (wallet)
const provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

const USER_PROXY_ADDRESS = "0x386b7F18599a0b392F9e3a22F1475A6129558833";

// ReadInstance of GelatoCore
const abi = [
  "event LogTest(address user, address src, address dest, uint256 srcAmt, uint256 minConverstionRate, bool userApproved, bool kyberApproved)"
];
const userProxyContract = new ethers.Contract(
  USER_PROXY_ADDRESS,
  abi,
  provider
);

// The block from which we start
let searchFromBlock = process.env.BLOCK;
console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
if (searchFromBlock === "") {
  throw new Error("You must call this script with 'export BLOCK=NUMBER;'");
}

// Set providers event search to searchFromBlock
provider.resetEventsBlock(searchFromBlock);

async function main() {
  userProxyContract.on(
    "LogTest",
    (
      user,
      src,
      dest,
      srcAmt,
      minConversionRate,
      userApproved,
      kyberApproved
    ) => {
      console.log(`user: ${user}`);
      console.log(`src: ${src}`);
      console.log(`dest: ${dest}`);
      console.log(`srcAmt: ${ethers.utils.formatUnits(srcAmt, 18)}`);
      console.log(
        `minConversionRate: ${ethers.utils.formatUnits(minConversionRate, 18)}`
      );
      console.log(`userApproved: ${userApproved}`);
      console.log(`kyberApproved: ${kyberApproved}`);
    }
  );
  await sleep(10000);
}

main().catch(err => console.log(err));
