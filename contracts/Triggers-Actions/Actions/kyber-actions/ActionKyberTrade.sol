pragma solidity ^0.5.0;

import '../GelatoActionsStandard.sol';
import '../../../Interfaces/Kyber/IKyber.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol';

contract ActionKyberTrade is GelatoActionsStandard
{
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

    event LogTest(address indexed user,
                  address indexed src,
                  address indexed dest,
                  uint256 srcAmt,
                  uint256 minConverstionRate,
                  uint256 kyberAllowance,
                  uint256 userAllowance,
                  uint256 thisBalance,
                  uint256 destAmt
    );

    function action(///@dev ONLY ENCODE this NO SELECTOR
                    address _user,
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
        uint256 kyberAllowance = srcERC20.allowance(address(this), kyber);
        if (kyberAllowance < _srcAmt) {
            srcERC20.approve(kyber, 2**255);
        }
        kyberAllowance = srcERC20.allowance(address(this), kyber);

        uint256 userAllowance = srcERC20.allowance(_user, address(this));
        if (userAllowance >= _srcAmt) {
            srcERC20.transferFrom(_user, address(this), _srcAmt);
        }
        uint256 srcBalance = srcERC20.balanceOf(address(this));

        ///@notice .call action - msg.sender is userProxy (address(this))
        destAmt = IKyber(kyber).trade(_src,
                                      _srcAmt,
                                      _dest,
                                      _user,
                                      2**255,
                                      _minConversionRate,
                                      address(0)  // fee-sharing
        );

        // Transfer destAmt ERC20 to user
        IERC20 destERC20 = IERC20(_dest);
        destERC20.transfer(_user, destAmt);

        emit LogTest(_user, _src, _dest, _srcAmt, _minConversionRate, kyberAllowance, userAllowance, srcBalance, destAmt);
        /*emit LogTrade(_src,
                      _srcAmt,
                      _dest,
                      destAmt,
                      _user,
                      _minConversionRate,
                      address(0)  // fee-sharing
        );*/
    }
}