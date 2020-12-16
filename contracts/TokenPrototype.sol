// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBaseSecurityToken.sol";
import "./IRegulatorService.sol";
import "./ServiceRegistry.sol";

contract TokenPrototype is IBaseSecurityToken, ERC20, Ownable {
    using SafeMath for uint256;

    struct Document {
        string uri;
        bytes32 contentHash;
    }

    event DocumentUpdated(bytes32 indexed name, string uri, bytes32 contentHash);

    // Uses status codes from ERC-1066
    byte private constant STATUS_ALLOWED = 0x11;

    mapping(bytes32 => Document) private documents;

    ServiceRegistry public registry;
    uint256 public cap;

    constructor(
        ServiceRegistry registry_,
        uint256 cap_,
        string memory name_,
        string memory symbol_
    )
        ERC20(name_, symbol_)
        Ownable()
    {
        require(address(registry_) != address(0), "registry is zero address");
        registry = registry_;
        cap = cap_;
        _setupDecimals(2);
    }

    function setCap(uint256 _cap) public onlyOwner {
        require(_cap >= totalSupply(), "cap can not be set less than totalSupply");
        cap = _cap;
    }

    function mint(address account, uint256 amount) public onlyOwner {
        require(totalSupply().add(amount) <= cap, "totalSupply must not exceed cap");
        ERC20._mint(account, amount);
    }

    function burn(address account, uint256 amount) public onlyOwner {
        ERC20._burn(account, amount);
    }

    function attachDocument(bytes32 _name, string calldata _uri, bytes32 _contentHash)
        external
        override
    {
        require(_name != 0, "name is required");
        require(bytes(_uri).length > 0, "uri is required");
        require(_contentHash != 0, "content hash is required");
        require(documents[_name].contentHash == 0, "document already exists");

        documents[_name] = Document(_uri, _contentHash);
        emit DocumentUpdated(_name, _uri, _contentHash);
    }

    function lookupDocument(bytes32 _name) public override view returns (string memory, bytes32) {
        Document storage doc = documents[_name];
        return (doc.uri, doc.contentHash);
    }

    function checkTransferAllowed(address from, address to, uint256 value)
        public
        override
        view
        returns (byte)
    {
        return _check(from, from, to, value);
    }

    function checkTransferFromAllowed(address from, address to, uint256 value)
        public
        override
        view
        returns (byte)
    {
        return _check(msg.sender, from, to, value);
    }

    function checkMintAllowed(address to, uint256 value) public override view returns (byte) {
        return _check(msg.sender, address(0), to, value);
    }

    function checkBurnAllowed(address from, uint256 value) public override view returns (byte) {
        return _check(msg.sender, from, address(0), value);
    }

    function renounceOwnership() public onlyOwner override view {
        revert("not supported");
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override view {
        byte status = _check(msg.sender, from, to, amount);
        require(status == STATUS_ALLOWED, hexCode(status));
    }

    function _check(address sender, address from, address to, uint256 value)
        private
        view
        returns (byte)
    {
        return _service().check(address(this), sender, from, to, value);
    }

    function _service() public view returns (IRegulatorService) {
        return IRegulatorService(registry.service());
    }

    function hexCode(byte _code) private pure returns (string memory) {
        uint8 code = uint8(_code);
        bytes memory result = new bytes(4);
        result[0] = byte("0");
        result[1] = byte("x");
        result[2] = byte(getHexDigit(code >> 4));
        result[3] = byte(getHexDigit(code & 0x0F));

        return string(result);
    }

    function getHexDigit(uint8 _digit) private pure returns (uint8) {
        uint8 result = _digit;
        result += 0x30; // ASCII number
        if (result > 0x39) { // ASCII letter A-F
            result += 7;
        }
        return result;
    }
}
