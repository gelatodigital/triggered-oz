module.exports = () => {
  setInterval(queryChainAndExecute, 30000);

  let searchFromBlock = process.env.BLOCK;

  async function queryChainAndExecute() {
    console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
    // Fetch Account & Contracts
    const accounts = await web3.eth.getAccounts();
    const account = accounts[0];
    const GelatoCore = artifacts.require("GelatoCore");
    const gelatoCore = await GelatoCore.at(
      "0x3540FFE83b2FE5488E25BBcF3dA2bD6b66c225fE"
    );

    console.log("\n\t Running Executor Node from:", account, "\n");

    // Fetch minted and not burned executionClaims
    const mintedClaims = {};
    // Get LogNewExecutionClaimMinted return values
    await gelatoCore
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
            executionClaimExpiryDate:
              event.returnValues.executionClaimExpiryDate,
            executorFee: event.returnValues.executorFee
          };
        });
      });

    // Get LogTriggerActionMinted return values
    await gelatoCore
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
    await gelatoCore
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
    await gelatoCore
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
      canExecuteReturn = await gelatoCore.contract.methods
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

        await gelatoCore.contract.methods
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
            from: account,
            gasPrice: txGasPrice
          })
          .once("receipt", receipt =>
            console.log("\n\t\tTx Receipt:\n", receipt)
          )
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
};
