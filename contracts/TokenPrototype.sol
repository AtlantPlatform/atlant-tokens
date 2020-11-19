pragma solidity >=0.4.24 <0.6.0;

import "./IBaseSecurityToken.sol";
import "./lib/ERC20.sol";
import "./lib/Ownable.sol";
import "./ServiceRegistry.sol";
import "./IRegulatorService.sol";

contract TokenPrototype is IBaseSecurityToken, ERC20, Ownable {
    struct Document {
        bytes32 name;
        string uri;
        bytes32 contentHash;
    }

    mapping(bytes32 => Document) private documents;

    ServiceRegistry public registry;
    uint256 public cap;

    constructor(ServiceRegistry _registry, uint256 _cap) public Ownable() {
        require(cap > 0);
        registry = _registry;
        cap = _cap;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        byte status = checkTransferAllowed(msg.sender, to, value);
        require(status == STATUS_ALLOWED, hexCode(status));
        return ERC20.transfer(to, value);
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        byte status = checkTransferFromAllowed(from, to, value);
        require(status == STATUS_ALLOWED, hexCode(status));
        return ERC20.transferFrom(from, to, value);
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public onlyOwner {
        _burn(account, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(totalSupply().add(amount) <= cap);

        byte status = checkMintAllowed(account, amount);
        require(status == STATUS_ALLOWED, hexCode(status));
        ERC20._mint(account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        byte status = checkBurnAllowed(account, amount);
        require(status == STATUS_ALLOWED, hexCode(status));
        ERC20._burn(account, amount);
    }

    function attachDocument(bytes32 _name, string calldata _uri, bytes32 _contentHash) external {
        require(_name.length > 0, "name of the document must not be empty");
        require(bytes(_uri).length > 0, "external URI to the document must not be empty");
        require(_contentHash.length > 0, "content hash is required, use SHA-1 when in doubt");
        require(documents[_name].name.length == 0, "document must not be existing under the same name");
        documents[_name] = Document(_name, _uri, _contentHash);
    }
   
    function lookupDocument(bytes32 _name) public view returns (string memory, bytes32) {
        Document storage doc = documents[_name];
        return (doc.uri, doc.contentHash);
    }

    // Uses status codes from ERC-1066
    byte private constant STATUS_ALLOWED = 0x11;

    function checkTransferAllowed(address from, address to, uint256 value) public view returns (byte) {
        return _check(from, to, value);
    }
   
    function checkTransferFromAllowed(address from, address to, uint256 value) public view returns (byte) {
        return _check(from, to, value);
    }
   
    function checkMintAllowed(address to, uint256 value) public view returns (byte) {
        return _check(address(0), to, value);
    }
   
    function checkBurnAllowed(address from, uint256 value) public view returns (byte) {
        return _check(from, address(0), value);
    }

    function _check(address from, address to, uint256 value) private view returns (byte) {
        return _service().check(address(this), msg.sender, from, to, value);
    }
    
    function _service() public view returns (IRegulatorService) {
        return IRegulatorService(registry.service());
    }

    function hexCode(byte _code) private pure returns (string memory) {
        require (_code >= 0);

        uint8 code = uint8(_code);                                                                                    
        bytes memory result = new bytes(4);                                                                                                         
        result[0] = byte('0');
        result[1] = byte('x');
        result[2] = byte(getHexDigit(code & 0x0F));
        result[3] = byte(getHexDigit(code >> 4));

        return string(result);
    }

    function getHexDigit(uint8 _digit) private pure returns (uint8) {
        _digit += 0x30; // ASCII number
        if (_digit > 0x39) { // ASCII letter A-F
            _digit += 7;
        }
        return _digit;
    }
}