pragma solidity ^0.5.10;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '../Interfaces/IGelatoCore.sol';

contract MultiMintForTimeTrigger
{
    using SafeMath for uint256;

    

    function multiMint(// gelatoCore.mintExecutionClaim params
                       address _timeTrigger,
                       uint256 _startTime,  // will be encoded here
                       address _action,
                       bytes calldata _specificActionParams,
                       address payable _selectedExecutor,
                       // MultiMintTimeBased params
                       uint256 _intervalSpan,
                       uint256 _numberOfMints
    )
            external
            payable
        {
            IGelatoCore gelatoCore
                = IGelatoCore(0x3540FFE83b2FE5488E25BBcF3dA2bD6b66c225fE);
            uint256 mintingDepositPerMint
                = gelatoCore.getMintingDepositPayable(_action, _selectedExecutor);
            require(msg.value == mintingDepositPerMint.mul(_numberOfMints),
                "MultiMintTimeBased.multiMint: incorrect msg.value"
            );
            for (uint256 i = 0; i < _numberOfMints; i++)
            {
                _startTime = _startTime.add(_intervalSpan.mul(i));
                bytes memory encodedStartTime = abi.encodePacked(_startTime);
                gelatoCore.mintExecutionClaim
                          .value(mintingDepositPerMint)
                          (_timeTrigger,
                           encodedStartTime,
                           _action,
                           _specificActionParams,
                           _selectedExecutor
                );
            }
        }
}