// Javascript Ethereum API Library
const ethers = require("ethers");

// Helpers
const sleep = require("./helpers/sleep.js").sleep;

// ENV VARIABLES
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
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

// Contract Addresses for instantiation
const GELATO_CORE_ADDRESS = "0x624f09392ae014484a1aB64c6D155A7E2B6998E6";

// Read-Write Instance of GelatoCore
const gelatoCoreContractABI = [
  "function execute(address _trigger, bytes _triggerPayload, address _userProxy, bytes _executePayload, uint256 _executeGas, uint256 _executionClaimId, uint256 _executionClaimExpiryDate, uint256 _executorFee) returns(uint8 executionResult)"
];
const gelatoCoreContractContract = new ethers.Contract(
  GELATO_CORE_ADDRESS,
  gelatoCoreContractABI,
  connectedWallet
);

// The block from which we start
let searchFromBlock = process.env.BLOCK;

// This gets executed with node
function main() {
  while (true) {
    try {
      setTimeout(queryChainAndExecute, 30000)
    } catch(err) {
      console.log(err);
      break;
    }
}
main();

// The logic that gets executed from inside main()
async function queryChainAndExecute() {
  console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
  console.log(`\n\t\t Running Executor Node from:\n, ${wallet.address}\n`);

  // Fetch minted and not burned executionClaims
  const mintedClaims = {};
  // Get LogNewExecutionClaimMinted return values
  await gelatoCoreContract
    .getPastEvents(
      "LogNewExecutionClaimMinted",
      {
        fromBlock: searchFromBlock,
        toBlock: "latest"
      },
      function(error, events) {}
    )
    .then(function(events) {
      events.forEach(event => {
        console.log(
          "\t\tLogNewExecutionClaimMinted:",
          "\t\texecutionClaimId: ",
          event.returnValues.executionClaimId,
          "\n"
        );
        mintedClaims[parseInt(event.returnValues.executionClaimId)] = {
          selectedExecutor: event.returnValues.selectedExecutor,
          executionClaimId: event.returnValues.executionClaimId,
          userProxy: event.returnValues.userProxy,
          executePayload: event.returnValues.executePayload,
          executeGas: event.returnValues.executeGas,
          executionClaimExpiryDate: event.returnValues.executionClaimExpiryDate,
          executorFee: event.returnValues.executorFee
        };
      });
    });

  // Get LogTriggerActionMinted return values
  await gelatoCoreContract
    .getPastEvents(
      "LogTriggerActionMinted",
      {
        fromBlock: searchFromBlock,
        toBlock: "latest"
      },
      function(error, events) {}
    )
    .then(function(events) {
      events.forEach(event => {
        mintedClaims[parseInt(event.returnValues.executionClaimId)].trigger =
          event.returnValues.trigger;
        mintedClaims[
          parseInt(event.returnValues.executionClaimId)
        ].triggerPayload = event.returnValues.triggerPayload;
        mintedClaims[parseInt(event.returnValues.executionClaimId)].action =
          event.returnValues.action;
        console.log(
          "\t\tLogTriggerActionMinted:",
          "\t\texecutionClaimId: ",
          event.returnValues.executionClaimId,
          "\n"
        );
      });
    });

  // Check which execution claims already got executed and remove then from the list
  await gelatoCoreContract
    .getPastEvents(
      "LogClaimExecutedBurnedAndDeleted",
      {
        fromBlock: searchFromBlock,
        toBlock: "latest"
      },
      function(error, events) {}
    )
    .then(function(events) {
      if (events !== undefined) {
        events.forEach(event => {
          delete mintedClaims[parseInt(event.returnValues.executionClaimId)];
          console.log(
            "\n\t\tLogClaimExecutedBurnedAndDeleted:\n",
            "\t\texecutionClaimId: ",
            event.returnValues.executionClaimId,
            "\n"
          );
        });
      }
    });

  // Check which execution claims already got cancelled and remove then from the list
  await gelatoCoreContract
    .getPastEvents(
      "LogExecutionClaimCancelled",
      {
        fromBlock: searchFromBlock,
        toBlock: "latest"
      },
      function(error, events) {}
    )
    .then(function(events) {
      if (events !== undefined) {
        events.forEach(event => {
          delete mintedClaims[parseInt(event.returnValues.executionClaimId)];
          console.log(
            "\n\t\tLogExecutionClaimCancelled:\n",
            "\t\texecutionClaimId: ",
            event.returnValues.executionClaimId,
            "\n"
          );
        });
      }
    });

  console.log("\n\n\t\tAvailable ExecutionClaims:", mintedClaims);

  function isEmpty(obj) {
    return Object.getOwnPropertyNames(obj).length === 0;
  }

  if (isEmpty(mintedClaims)) {
    searchFromBlock = await web3.eth.getBlockNumber();
    searchFromBlock = searchFromBlock - 2;
  }

  // Loop through all execution claims and check if they are executable. If yes, execute, if not, skip
  let canExecuteReturn;

  for (let executionClaimId in mintedClaims) {
    console.log(
      "\n\tCheck if ExeutionClaim ",
      executionClaimId,
      " is executable\n"
    );
    // Call canExecute
    canExecuteReturn = await gelatoCoreContract.contract.methods
      .canExecute(
        mintedClaims[executionClaimId].trigger,
        mintedClaims[executionClaimId].triggerPayload,
        mintedClaims[executionClaimId].userProxy,
        mintedClaims[executionClaimId].executePayload,
        mintedClaims[executionClaimId].executeGas,
        mintedClaims[executionClaimId].executionClaimId,
        mintedClaims[executionClaimId].executionClaimExpiryDate,
        mintedClaims[executionClaimId].executorFee
      )
      .call();

    console.log("\n\t CanExecute Result:", canExecuteReturn, "\n");

    if (parseInt(canExecuteReturn.toString()) === 0) {
      console.log(`
        🔥🔥🔥ExeutionClaim: ${executionClaimId} is executable🔥🔥🔥
    `);
      console.log(`
        ⚡⚡⚡ Send TX ⚡⚡⚡
    `);

      let txGasPrice = await web3.utils.toWei("5", "gwei");

      await gelatoCoreContract.contract.methods
        .execute(
          mintedClaims[executionClaimId].trigger,
          mintedClaims[executionClaimId].triggerPayload,
          mintedClaims[executionClaimId].userProxy,
          mintedClaims[executionClaimId].executePayload,
          mintedClaims[executionClaimId].executeGas,
          mintedClaims[executionClaimId].executionClaimId,
          mintedClaims[executionClaimId].executionClaimExpiryDate,
          mintedClaims[executionClaimId].executorFee
        )
        .send({
          gas: 500000,
          from: wallet.address,
          gasPrice: txGasPrice
        })
        .once("receipt", receipt => console.log("\n\t\tTx Receipt:\n", receipt))
        .on("error", error => {
          console.log(error);
        });
    } else {
      console.log(
        `❌❌❌ExeutionClaim: ${executionClaimId} is NOT executable❌❌❌`
      );
    }
  }
}
