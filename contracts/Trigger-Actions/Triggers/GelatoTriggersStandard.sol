pragma solidity ^0.5.10;

contract GelatoTriggersStandard {
    bytes4 internal triggerSelector;

    constructor(string memory _triggerSignature)
        internal
    {
        triggerSelector = bytes4(keccak256(bytes(_triggerSignature)));
    }

    function getTriggerSelector()
        external
        view
        returns(bytes4)
    {
        return triggerSelector;
    }
}