pragma solidity ^0.5.10;

contract Success {
    bool public success;

    function reset() public {
        success = false;
    }
}

contract TestDelegateCall is Success {
    function callB(address b, address c, address d) public {
        bytes memory payload = abi.encodeWithSignature("delegatecallC(address,address)", c, d);
        (bool _success,) = b.call(payload);
        success = _success;
    }
}

contract B is Success {
    function delegatecallC(address c, address d) public {
        bytes memory payload = abi.encodeWithSignature("callD(address)", d);
        (bool _success,) = c.delegatecall(payload);
        success = _success;
    }
}

contract C is Success {
    function callD(address d) public {
        bytes memory payload = abi.encodeWithSignature("d()");
        (bool _success,) = d.call(payload);
        success = _success;

    }
}

contract D {
    address payable public msgSender;

    function d() public {msgSender = msg.sender;}
}