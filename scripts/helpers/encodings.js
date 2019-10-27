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

exports.getMultiMintForTimeTriggerPayloadWithSelector = (
  timeTrigger,
  startTime,
  action,
  encodedSpecificActionParams,
  selectedExecutor,
  intervalSpan,
  numberOfMints
) => {
  let encodedMultiMintPayloadWithSelector = web3.eth.abi.encodeFunctionCall(
    {
      name: "multiMint",
      type: "function",
      inputs: [
        { type: "address", name: "_timeTrigger" },
        { type: "uint256", name: "_startTime" },
        { type: "address", name: "_action" },
        { type: "bytes", name: "_specificActionParams" },
        { type: "address", name: "_selectedExecutor" },
        { type: "uint256", name: "_intervalSpan" },
        { type: "uint256", name: "_numberOfMints" }
      ]
    },
    [
      timeTrigger,
      startTime,
      action,
      encodedSpecificActionParams,
      selectedExecutor,
      intervalSpan,
      numberOfMints
    ]
  );
  return encodedMultiMintPayloadWithSelector;
};
