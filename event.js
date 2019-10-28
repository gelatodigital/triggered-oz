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
// Log Parsing
let iface = new ethers.utils.Interface(abi);

// The block from which we start
let searchFromBlock = process.env.BLOCK;
console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
if (searchFromBlock === "") {
  throw new Error("You must call this script with 'export BLOCK=NUMBER;'");
}

async function main() {
  // Set providers event search to searchFromBlock
  let topicTest = ethers.utils.id(
    "LogTest(address,address,address,uint256,uint256,bool,bool)"
  );
  let filterTest = {
    address: USER_PROXY_ADDRESS,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicTest]
  };
  const logsTest = await provider.getLogs(filterTest);
  console.log(logsTest);
  await sleep(10000);
  logsTest.forEach(log => {
    const parsedLog = iface.parseLog(log);
    console.log(`user: ${parsedLog.values.user}`);
    console.log(`src: ${parsedLog.values.src}`);
    console.log(`dest: ${parsedLog.values.dest}`);
    console.log(
      `srcAmt: ${ethers.utils.formatUnits(parsedLog.values.srcAmt, 18)}`
    );
    console.log(
      `minConversionRate: ${ethers.utils.formatUnits(
        parsedLog.values.minConversionRate,
        18
      )}`
    );
    console.log(`userApproved: ${parsedLog.values.userApproved}`);
    console.log(`kyberApproved: ${parsedLog.values.kyberApproved}`);
  });
}

main().catch(err => console.log(err));
