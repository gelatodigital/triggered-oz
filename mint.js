// For truffle exec
module.exports = function(callback) {
  let searchFromBlock = process.env.BLOCK;
  setInterval(
    queryChainAndExecute(searchFromBlock)
      .then(() => callback())
      .catch(err => callback(err)),
    30000
  );
};

async function mint(searchFromBl) {
  console.log("\n\t\t Starting Minting Script\n");
  // Fetch Account & Contracts
  const accounts = await web3.eth.getAccounts();
  const sender = accounts[0];
  const GelatoCore = artifacts.require("GelatoCore");
  const gelatoCore = await GelatoCore.at(
    "0xbe9bDF5F7b56616bd09CAd224c8903D2de51FCeb"
  );

  console.log("\n\t Minting Claim from:", sender, "\n");

  tx = gelatoCore.mint

}
