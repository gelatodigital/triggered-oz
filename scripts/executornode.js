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
  "function canExecute(address _trigger, bytes _triggerPayload, address _userProxy, bytes _actionPayload, uint256 _executeGas, uint256 _executionClaimId, uint256 _executionClaimExpiryDate, uint256 _executorFee) view returns (uint8)",
  "function execute(address _trigger, bytes _triggerPayload, address _userProxy, bytes _actionPayload, address _action, uint256 _executeGas, uint256 _executionClaimId, uint256 _executionClaimExpiryDate, uint256 _executorFee) returns (uint8 executionResult)",
  "event LogNewExecutionClaimMinted(address indexed selectedExecutor, uint256 indexed executionClaimId, address indexed userProxy, bytes actionPayload, uint256 executeGas, uint256 executionClaimExpiryDate, uint256 executorFee)",
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
  setInterval(queryChainAndExecute, 60 * 1000);
}
main().catch(err => console.log(err));

// Fetch minted and not burned executionClaims
let mintedClaims = {};

// The logic that gets executed from inside main()
async function queryChainAndExecute() {
  let currentBlock = await provider.getBlockNumber();
  console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
  console.log(`\n\t\t Current block number:       ${searchFromBlock}`);
  console.log(`\n\t\t Running Executor Node from: ${wallet.address}\n`);

  // add this handler before emitting any events
  process.on("uncaughtException", err => {
    console.log("UNCAUGHT EXCEPTION - keeping process alive:", err);
  });

  // Log Parsing
  let iface = new ethers.utils.Interface(gelatoCoreContractABI);

  // LogNewExecutionClaimMinted
  let topicMinted = ethers.utils.id(
    "LogNewExecutionClaimMinted(address,uint256,address,bytes,uint256,uint256,uint256)"
  );
  let filterMinted = {
    address: GELATO_CORE_ADDRESS,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicMinted]
  };
  try {
    const logsMinted = await provider.getLogs(filterMinted);
    logsMinted.forEach(log => {
      if (log !== undefined) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parsedLog.values.executionClaimId.toString();
        console.log(
          `\t\tLogNewExecutionClaimMinted:\n\t\texecutionClaimId: ${executionClaimId}\n`
        );
        mintedClaims[executionClaimId] = {
          selectedExecutor: parsedLog.values.selectedExecutor,
          executionClaimId: executionClaimId,
          userProxy: parsedLog.values.userProxy,
          actionPayload: parsedLog.values.actionPayload,
          executeGas: parsedLog.values.executeGas,
          executionClaimExpiryDate: parsedLog.values.executionClaimExpiryDate,
          executorFee: parsedLog.values.executorFee
        };
      }
    });
  } catch (err) {
    console.log(err);
  }

  // LogTriggerActionMinted
  let topicTAMinted = ethers.utils.id(
    "LogTriggerActionMinted(uint256,address,bytes,address)"
  );
  let filterTAMinted = {
    address: GELATO_CORE_ADDRESS,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicTAMinted]
  };
  try {
    const logsTAMinted = await provider.getLogs(filterTAMinted);
    logsTAMinted.forEach(log => {
      if (log !== undefined) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parsedLog.values.executionClaimId.toString();
        console.log(
          `\t\tLogTriggerActionMinted:\n\t\texecutionClaimId: ${executionClaimId}\n`
        );
        mintedClaims[executionClaimId].trigger = parsedLog.values.trigger;
        mintedClaims[executionClaimId].triggerPayload =
          parsedLog.values.triggerPayload;
        mintedClaims[executionClaimId].action = parsedLog.values.action;
      }
    });
  } catch (err) {
    console.log(err);
  }

  // LogClaimExecutedAndDeleted
  let topicDeleted = ethers.utils.id(
    "LogClaimExecutedAndDeleted(uint256,address,address,uint256,uint256,uint256,uint256)"
  );
  let filterDeleted = {
    address: GELATO_CORE_ADDRESS,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicDeleted]
  };
  try {
    const logsDeleted = await provider.getLogs(filterDeleted);
    logsDeleted.forEach(log => {
      if (log !== undefined) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parsedLog.values.executionClaimId.toString();
        if (mintedClaims[executionClaimId] === undefined) {
          delete mintedClaims[executionClaimId];
        } else {
          for (let key of Object.keys(mintedClaims[executionClaimId])) {
            delete mintedClaims[executionClaimId][key];
          }
          console.log(
            `\n\t\t LogClaimExecutedBurnedAndDeleted: ${executionClaimId} ${Object.keys(
              mintedClaims[executionClaimId]
            ).length === 0}`
          );
        }
      }
    });
  } catch (err) {
    console.log(err);
  }

  // LogExecutionClaimCancelled
  let topicCancelled = ethers.utils.id(
    "LogExecutionClaimCancelled(uint256,address,address)"
  );
  let filterCancelled = {
    address: GELATO_CORE_ADDRESS,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicCancelled]
  };
  try {
    const logsCancelled = await provider.getLogs(filterCancelled);
    logsCancelled.forEach(log => {
      if (log !== undefined) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parsedLog.values.executionClaimId.toString();
        for (let key of Object.keys(mintedClaims[executionClaimId])) {
          delete mintedClaims[executionClaimId][key];
        }
        console.log(
          `\n\t\t LogExecutionClaimCancelled: ${executionClaimId} ${Object.keys(
            mintedClaims[executionClaimId]
          ).length === 0}`
        );
      }
    });
  } catch (err) {
    console.log(err);
  }

  // Log available executionClaims
  console.log("\n\n\t\t Available ExecutionClaims:");
  for (let executionClaimId in mintedClaims) {
    if (executionClaimId !== undefined) {
      for (let [key, value] of Object.entries(mintedClaims[executionClaimId])) {
        console.log(`\t\t${key}: ${value}`);
      }
      console.log("\n");
    }
  }

  // Loop through all execution claims and check if they are executable.
  //  If yes, execute, if not, skip
  let canExecuteReturn;
  const canExecuteResults = [
    "WrongCalldataOrAlreadyDeleted",
    "UserProxyOutOfFunds",
    "NonExistantExecutionClaim",
    "ExecutionClaimExpired",
    "TriggerReverted",
    "NotExecutable",
    "Executable"
  ];
  for (let executionClaimId in mintedClaims) {
    if (executionClaimId === undefined) continue;
    // Call canExecute
    try {
      if (executionClaimId !== undefined) {
        canExecuteReturn = await gelatoCoreContract.canExecute(
          mintedClaims[executionClaimId].trigger,
          mintedClaims[executionClaimId].triggerPayload,
          mintedClaims[executionClaimId].userProxy,
          mintedClaims[executionClaimId].actionPayload,
          mintedClaims[executionClaimId].executeGas,
          mintedClaims[executionClaimId].executionClaimId,
          mintedClaims[executionClaimId].executionClaimExpiryDate,
          mintedClaims[executionClaimId].executorFee
        );
        console.log(
          `\n\t\t CanExecute Result: ${
            canExecuteResults[parseInt(canExecuteReturn)]
          }`
        );
        if (canExecuteResults[parseInt(canExecuteReturn)] === "Executable") {
          console.log(`
            🔥🔥🔥ExeutionClaim: ${executionClaimId} is executable🔥🔥🔥
          `);
          let tx;
          try {
            console.log(`\t\t⚡⚡⚡ Send TX ⚡⚡⚡\n`);
            tx = await gelatoCoreContract.execute(
              mintedClaims[executionClaimId].trigger,
              mintedClaims[executionClaimId].triggerPayload,
              mintedClaims[executionClaimId].userProxy,
              mintedClaims[executionClaimId].actionPayload,
              mintedClaims[executionClaimId].action,
              mintedClaims[executionClaimId].executeGas,
              mintedClaims[executionClaimId].executionClaimId,
              mintedClaims[executionClaimId].executionClaimExpiryDate,
              mintedClaims[executionClaimId].executorFee,
              {
                gasLimit: 5000000
              }
            );
            console.log(`\t\t gelatoCore.execute() txHash:\n \t${tx.hash}\n`);
            // The operation is NOT complete yet; we must wait until it is mined
            console.log(
              "\t\t waiting for the execute transaction to get mined \n"
            );
            txreceipt = await tx.wait();
            console.log(`\t\t Execute TX Receipt:\n ${txreceipt.blockNumber}`);
          } catch (err) {
            console.log(err);
          }
        } else {
          console.log(
            `\t\t❌❌❌ExeutionClaim: ${executionClaimId} is NOT executable❌❌❌`
          );
        }
      }
    } catch (err) {
      console.log(err);
    }

    // Reset the searchFromBlock
    searchFromBlock = currentBlock - 8;
    console.log(
      `\n\n\t\t Current Block: ${currentBlock}\n\t\t Next search from block: ${searchFromBlock}`
    );
  }
}
