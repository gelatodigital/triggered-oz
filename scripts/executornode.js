// Javascript Ethereum API Library
const ethers = require("ethers");

// Helpers
const sleep = require("./helpers/sleep.js").sleep;

// ENV VARIABLES
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
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
  "function canExecute(address _trigger, bytes _triggerPayload, address _userProxy, bytes _executePayload, uint256 _executeGas, uint256 _executionClaimId, uint256 _executionClaimExpiryDate, uint256 _executorFee) view returns (uint8)",
  "function execute(address _trigger, bytes _triggerPayload, address _userProxy, bytes _executePayload, uint256 _executeGas, uint256 _executionClaimId, uint256 _executionClaimExpiryDate, uint256 _executorFee) returns (uint8 executionResult)",
  "event LogNewExecutionClaimMinted(address indexed selectedExecutor, uint256 indexed executionClaimId, address indexed userProxy, bytes executePayload, uint256 executeGas, uint256 executionClaimExpiryDate, uint256 executorFee)",
  "event LogTriggerActionMinted(uint256 indexed executionClaimId, address indexed trigger, bytes triggerPayload, address indexed action)",
  "event LogClaimExecutedAndDeleted(uint256 indexed executionClaimId, address indexed userProxy, address indexed executor, uint256 gasUsedEstimate, uint256 gasPriceUsed, uint256 executionCostEstimate, uint256 executorPayout)",
  "event LogExecutionClaimCancelled(uint256 indexed executionClaimId, address indexed userProxy, address indexed cancelor)"
];
const gelatoCoreContract = new ethers.Contract(
  GELATO_CORE_ADDRESS,
  gelatoCoreContractABI,
  connectedWallet
);

// The block from which we start
let searchFromBlock = process.env.BLOCK;
console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
if (searchFromBlock === "") {
  throw new Error("You must call this script with 'export BLOCK=NUMBER;'");
}

// This gets executed with node
async function main() {
  queryChainAndExecute();
  setInterval(queryChainAndExecute, 120 * 1000);
}
main().catch(err => console.log(err));

// The logic that gets executed from inside main()
async function queryChainAndExecute() {
  let currentBlock = await provider.getBlockNumber();
  console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
  console.log(`\n\t\t Current block number:       ${searchFromBlock}`);
  console.log(`\n\t\t Running Executor Node from: ${wallet.address}\n`);

  // Set providers event search to searchFromBlock
  provider.resetEventsBlock(searchFromBlock);

  // Fetch minted and not burned executionClaims
  let mintedClaims = {};

  // add this handler before emitting any events
  process.on("uncaughtException", err => {
    console.log("UNCAUGHT EXCEPTION - keeping process alive:", err);
  });

  // Get LogNewExecutionClaimMinted return values
  gelatoCoreContract.on(
    "LogNewExecutionClaimMinted",
    (
      selectedExecutor,
      executionClaimId,
      userProxy,
      executePayload,
      executeGas,
      executionClaimExpiryDate,
      executorFee
    ) => {
      console.log(
        `\t\tLogNewExecutionClaimMinted:\n\t\texecutionClaimId: ${executionClaimId}\n`
      );
      mintedClaims[executionClaimId.toString()] = {
        selectedExecutor: selectedExecutor,
        executionClaimId: executionClaimId,
        userProxy: userProxy,
        executePayload: executePayload,
        executeGas: executeGas,
        executionClaimExpiryDate: executionClaimExpiryDate,
        executorFee: executorFee
      };
    }
  );
  // Get LogTriggerActionMinted return values
  gelatoCoreContract.on(
    "LogTriggerActionMinted",
    (executionClaimId, trigger, triggerPayload, action) => {
      mintedClaims[executionClaimId.toString()].trigger = trigger;
      mintedClaims[executionClaimId.toString()].triggerPayload = triggerPayload;
      mintedClaims[executionClaimId.toString()].action = action;
      console.log(
        `\t\tLogTriggerActionMinted:\n\t\texecutionClaimId: ${executionClaimId}\n`
      );
    }
  );
  // Check which execution claims already got executed and remove then from the list
  gelatoCoreContract.on("LogClaimExecutedAndDeleted", executionClaimId => {
    for (let key of Object.keys(mintedClaims[executionClaimId.toString()])) {
      delete mintedClaims[executionClaimId.toString()][key];
    }
    console.log(
      `\n\t\t LogClaimExecutedBurnedAndDeleted: ${executionClaimId} ${Object.keys(
        mintedClaims[executionClaimId.toString()]
      ).length === 0}`
    );
  });
  // Check which execution claims already got cancelled and remove then from the list
  gelatoCoreContract.on("LogExecutionClaimCancelled", executionClaimId => {
    for (let key of Object.keys(mintedClaims[executionClaimId.toString()])) {
      delete mintedClaims[executionClaimId.toString()][key];
    }
    console.log(
      `\n\t\t LogExecutionClaimCancelled: ${executionClaimId} ${Object.keys(
        mintedClaims[executionClaimId.toString()]
      ).length === 0}`
    );
  });

  await sleep(3000);

  // Log available executionClaims
  console.log("\n\n\t\t Available ExecutionClaims:");
  for (let executionClaimId in mintedClaims) {
    for (let [key, value] of Object.entries(mintedClaims[executionClaimId])) {
      console.log(`\t\t${key}: ${value}`);
    }
    console.log("\n");
  }
  await sleep(2000);

  // Reset the searchFromBlock
  searchFromBlock = currentBlock - 2;
  console.log(
    `\t\t Current Block: ${currentBlock}\n\t\t Next search from block: ${searchFromBlock}`
  );

  // Loop through all execution claims and check if they are executable.
  //  If yes, execute, if not, skip
  let canExecuteReturn;
  for (let executionClaimId in mintedClaims) {
    console.log(
      `\n\tCheck if ExeutionClaim ${executionClaimId} is executable\n`
    );
    // Call canExecute
    try {
      canExecuteReturn = await gelatoCoreContract.canExecute(
        mintedClaims[executionClaimId].trigger,
        mintedClaims[executionClaimId].triggerPayload,
        mintedClaims[executionClaimId].userProxy,
        mintedClaims[executionClaimId].executePayload,
        mintedClaims[executionClaimId].executeGas,
        mintedClaims[executionClaimId].executionClaimId,
        mintedClaims[executionClaimId].executionClaimExpiryDate,
        mintedClaims[executionClaimId].executorFee
      );
    } catch (err) {
      console.log(err);
    }

    const canExecuteResults = [
      "WrongCalldataOrAlreadyDeleted",
      "UserProxyOutOfFunds",
      "NonExistantExecutionClaim",
      "ExecutionClaimExpired",
      "TriggerReverted",
      "NotExecutable",
      "Executable"
    ];

    console.log(
      `\n\t\t CanExecute Result: ${
        canExecuteResults[parseInt(canExecuteReturn)]
      }`
    );
    await sleep(2000);
    if (canExecuteResults[parseInt(canExecuteReturn)] === "Executable") {
      console.log(`
        🔥🔥🔥ExeutionClaim: ${executionClaimId} is executable🔥🔥🔥
    `);
      console.log(`⚡⚡⚡ Send TX ⚡⚡⚡\n`);
      let tx;
      try {
        tx = await gelatoCoreContract.execute(
          mintedClaims[executionClaimId].trigger,
          mintedClaims[executionClaimId].triggerPayload,
          mintedClaims[executionClaimId].userProxy,
          mintedClaims[executionClaimId].executePayload,
          mintedClaims[executionClaimId].executeGas,
          mintedClaims[executionClaimId].executionClaimId,
          mintedClaims[executionClaimId].executionClaimExpiryDate,
          mintedClaims[executionClaimId].executorFee,
          {
            gasLimit: 1000000
          }
        );
      } catch (err) {
        console.log(err);
      }
      console.log(`\t\t gelatoCore.execute() txHash:\n \t${tx.hash}\n`);
      // The operation is NOT complete yet; we must wait until it is mined
      console.log("\t\t waiting for the execute transaction to get mined \n");
      try {
        await tx.wait();
      } catch (err) {
        console.log(err);
      }
    } else {
      console.log(
        `❌❌❌ExeutionClaim: ${executionClaimId} is NOT executable❌❌❌`
      );
    }
  }
}
