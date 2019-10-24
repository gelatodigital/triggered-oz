require("dotenv").config();

const HDWalletProvider = require("@truffle/hdwaller-provider");
const infuraNodeEndpoint = process.env.ROPSTEN_INFURA;

module.exports = {
  networks: {
    development: {
      protocol: "http",
      host: "localhost",
      port: 8545,
      gas: 5000000,
      gasPrice: 5e9,
      networkId: "*"
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(process.env.ROPSTEN_MNEMONIC, infuraNodeEndpoint),
      networkId: 3 // Ropsten's id
    }
  }
};
