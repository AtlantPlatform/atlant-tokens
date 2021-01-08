// SPDX-License-Identifier: MIT
/**
   Copyright (c) 2019-2021 Digital Asset Exchange Limited
   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:
   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.
   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
*/

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
