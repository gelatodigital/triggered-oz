const Web3 = require("web3");
const web3 = new Web3(Web3.givenProvider);

exports.getEncodedActionKyberTradeParams = (
  src,
  dest,
  srcAmount,
  minConversionRate
) => {
  let encodedActionParams = web3.eth.abi.encodeParameters(
    ["address", "address", "uint256", "uint256"],
    [src, dest, srcAmount, minConversionRate]
  );

  return encodedActionParams;
};
