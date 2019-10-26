const ethers = require("ethers");

require("dotenv").config();
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;

const provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

const multiMintProxyAddress = "0x22ef77200f1e98eee9545659f31376acd718f7af";
const multiMintABI = require("./build/contracts/MultiMintForTimeTrigger.json")
  .abi;

const multiMintContract = new ethers.Contract(
  multiMintProxyAddress,
  multiMintABI,
  connectedWallet
);

const kyberProxyAddress = "0x818E6FECD516Ecc3849DAf6845e3EC868087B755";
const kyberABI = [
  "function getExpectedRate(address src, address dest, uint srcQty) view returns(uint,uint)"
];
const kyberContract = new ethers.Contract(
  kyberProxyAddress,
  kyberABI,
  connectedWallet
);

const timeTriggerProxyAddress = "0x8ef28734d54d63A50a7D7F37A4523f9af5ca2B19";
const startTime = Date.now();
const kyberActionProxyAddress = "0x8710aF1bC86a569c18Ec5b41A656B3aA9Eca9037";
const src = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6"; // ropsten knc
const dest = "0xaD6D458402F60fD3Bd25163575031ACDce07538D"; // ropsten dai
const srcAmount = ethers.utils.bigNumberify("10000000000000000000"); // 10 KNC
let minConversionRate;

const getEncodedActionKyberTradeParams = require("./encodings.js")
  .getEncodedActionKyberTradeParams;

async function main() {
  [_, minConversionRate] = await kyberContract.getExpectedRate(
    src,
    dest,
    srcAmount
  );
  console.log(
    `\n\tminConversionRate: ${minConversionRate.div("1000000000000000000").toNumber()}\n`
  );

  const encodedActionParams = getEncodedActionKyberTradeParams(
    src,
    dest,
    srcAmount,
    minConversionRate
  );

  console.log(`\tencodedActionParams: ${encodedActionParams}\n`);

  let tx = await multiMintContract.multiMint(
    timeTriggerProxyAddress,
    startTime,
    kyberActionProxyAddress,
    encodedActionParams
  );

  console.log(`\tmultiMint txHash: ${tx}`);
}
main().then(err => console.log(err));
