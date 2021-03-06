// SPDX-License-Identifier: APACHE-2.0
/**
   Copyright (c) 2017 Harbor Platform, Inc.
   Licensed under the Apache License, Version 2.0 (the “License”);
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
   http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an “AS IS” BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

pragma solidity 0.7.5;

interface IRegulatorService {
    function check(
        address _token,
        address _spender,
        address _from,
        address _to,
        uint256 _amount
    ) external view returns (byte);
}
