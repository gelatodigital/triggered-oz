pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

contract GelatoTriggersStandard is Initializable
{
    bytes4 internal triggerSelector;

    function _initialize(string memory _triggerSignature)
        internal
        initializer
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