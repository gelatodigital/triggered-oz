pragma solidity ^0.5.0;

import '../../../Interfaces/IERC20.sol';
import '../../../Interfaces/Kyber/IKyber.sol';

contract Helper {
    /**
     * @dev get kyber proxy address
     */
    function getAddressKyber() public pure returns (address kyber) {
        kyber = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;
    }

    /**
     * @dev gets token balance
     * @param src is the token being sold
     * @return tknBal - erc20 balance
     */
    function getBal(address src, address _owner)
        public
        view
        returns (uint256 tknBal)
    {
        tknBal = IERC20(src).balanceOf(address(_owner));
    }

    /**
     * @dev getting rates from Kyber
     * @param src is the token being sold
     * @param dest is the token being bought
     * @param srcAmt is the amount of token being sold
     * @return expectedRate - the current rate
     * @return slippageRate - rate with 3% slippage
     */
    function getExpectedRate(address src,
                             address dest,
                             uint256 srcAmt
    )
        public
        view
        returns (uint256 expectedRate,
                 uint256 slippageRate
        )
    {
        (expectedRate,
         slippageRate) = IKyber(getAddressKyber()).getExpectedRate(src, dest, srcAmt);
    }

    /**
     * @dev fetching token from the user ERC20
     * @param user is the user
     * @param src is the token which is being sold
     * @param srcAmt is the amount of token being sold
     */
    function getToken(address user,
                      address src,
                      uint256 srcAmt
    )
        internal
    {
        IERC20 tknContract = IERC20(src);
        setApproval(tknContract, srcAmt);
        tknContract.transferFrom(user, address(this), srcAmt);
    }

    /**
     * @dev setting allowance to kyber for the "user proxy" if required
     * @param tknContract is the token
     * @param srcAmt is the amount of token to sell
     */
    function setApproval(IERC20 tknContract, uint256 srcAmt)
        internal
    {
        uint256 tokenAllowance = tknContract.allowance(address(this), getAddressKyber());
        if (srcAmt > tokenAllowance) {
            tknContract.approve(getAddressKyber(), 2**255);
        }
    }

}

contract KyberAction is Helper {
    bytes4 constant internal actionSelector
        = bytes4(keccak256(bytes("action(address,address,address,uint256,uint256)")));
    uint256 constant internal actionGasStipend = 300000;

    function getActionSelector() external pure returns(bytes4) {return actionSelector;}
    function getActionGasStipend() external pure returns(uint256) {return actionGasStipend;}


    event LogTrade(address src,
                   uint256 srcAmt,
                   address dest,
                   uint256 destAmt,
                   address user,
                   uint256 minConversionRate,
                   address gelatoCore
    );

    function action(///@dev dont encode the user and dont encodeWithSelector
                    address _user,
                    ///@dev encode all below
                    address _src,
                    address _dest,
                    uint256 _srcAmt,
                    uint256 _minConversionRate
    )
        external
        returns (uint256 destAmt)
    {
        getToken(_user, _src, _srcAmt);
        destAmt = IKyber(getAddressKyber()).trade.value(0)(_src,
                                                           _srcAmt,
                                                           _dest,
                                                           _user,
                                                           2**255,
                                                           _minConversionRate,
                                                           address(0)  // fee-sharing
        );
        emit LogTrade(src,
                      srcAmt,
                      dest,
                      destAmt,
                      _user,
                      _minConversionRate,
                      address(0)  // fee-sharing
        );

    }

}