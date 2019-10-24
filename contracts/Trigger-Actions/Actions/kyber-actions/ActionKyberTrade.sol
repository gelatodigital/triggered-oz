pragma solidity ^0.5.0;

import '../GelatoActionsStandard.sol';
import '../../../Interfaces/Kyber/IKyber.sol';
import '../../../Helpers/GelatoERC20Lib.sol';

contract ActionKyberTrade is GelatoActionsStandard
{
    using GelatoERC20Lib for IERC20;

    function initialize()
        external
        initializer
    {
        GelatoActionsStandard
            ._initialize("action(address,address,address,uint256,uint256)",
                         300000
        );
    }

    event LogTrade(address src,
                   uint256 srcAmt,
                   address dest,
                   uint256 destAmt,
                   address user,
                   uint256 minConversionRate,
                   address feeSharingParticipant
    );

    function action(///@dev DONT ENCODE selector and user (both encoded by gelatoCore)
                    address _user,
                    ///@dev ONLY ENCODE all the below "specificActionParams"
                    address _src,
                    address _dest,
                    uint256 _srcAmt,
                    uint256 _minConversionRate
    )
        external
        returns (uint256 destAmt)
    {
        ///@notice KyberNetworkProxy on ropsten
        address kyber = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;

        ///@notice ERC20 preparation
        ///@notice in context of .delegatecall address(this) is the userProxy
        IERC20 srcERC20 = IERC20(_src);
        // Make sure kyber contract is MAX-approved by userProxy
        if (!srcERC20._hasERC20Allowance(address(this), kyber, _srcAmt))
        {
            srcERC20._safeIncreaseERC20Allowance(kyber, 2**255);
        }
        // Transfer funds from user to their userProxy
        ///@notice this requires users to have approved the action beforehand
        srcERC20._safeTransferFrom(_user, address(this), _srcAmt);

        ///@notice .call action - msg.sender is userProxy (address(this))
        destAmt = IKyber(kyber).trade(_src,
                                      _srcAmt,
                                      _dest,
                                      _user,
                                      2**255,
                                      _minConversionRate,
                                      address(0)  // fee-sharing
        );
        if (destAmt == 0) {
            revert("ActionKyberTrade: trade failed (destAmt == 0)");
        }
        emit LogTrade(_src,
                      _srcAmt,
                      _dest,
                      destAmt,
                      _user,
                      _minConversionRate,
                      address(0)  // fee-sharing
        );
    }
}