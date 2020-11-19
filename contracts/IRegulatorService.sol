pragma solidity >=0.4.24 <0.6.0;

interface IRegulatorService {
    function check(address _token, address _spender, address _from, address _to, uint256 _amount) external view returns (byte);
}