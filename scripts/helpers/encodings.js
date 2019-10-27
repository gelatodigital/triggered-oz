// Javascript Ethereum API Library
const ethers = require("ethers");

exports.getEncodedActionKyberTradeParams = (
  src,
  dest,
  srcAmount,
  minConversionRate
) => {
  const abiCoder = ethers.utils.defaultAbiCoder;
  const encodedActionParams = abiCoder.encode(
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
  const multiMintABI = [
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
    }
  ];
  const interface = new ethers.utils.Interface(multiMintABI);

  const encodedMultiMintPayloadWithSelector = interface.functions.multiMint.encode(
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
