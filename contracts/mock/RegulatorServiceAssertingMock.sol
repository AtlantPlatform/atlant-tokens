// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "../IRegulatorService.sol";

contract RegulatorServiceAssertingMock is IRegulatorService {
    address public token;
    address public spender;
    address public from;
    address public to;
    uint256 public amount;
    byte public returnStatus;

    function setAssertions(
        address _token,
        address _spender,
        address _from,
        address _to,
        uint256 _amount,
        byte _returnStatus
    ) external {
        token = _token;
        spender = _spender;
        from = _from;
        to = _to;
        amount = _amount;
        returnStatus = _returnStatus;
    }

    function check(
        address _token,
        address _spender,
        address _from,
        address _to,
        uint256 _amount
    )
        external
        override
        view
        returns (byte)
    {
        require(_token == token, "token address assertion failed");
        require(_spender == spender, "spender address assertion failed");
        require(_from == from, "from address assertion failed");
        require(_to == to, "to address assertion failed");
        require(_amount == amount, "amount assertion failed");
        return returnStatus;
    }
}
