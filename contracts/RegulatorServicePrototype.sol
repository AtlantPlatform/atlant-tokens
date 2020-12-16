// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./lib/AddrSet.sol";
import "./IBaseSecurityToken.sol";
import "./IRegulatorService.sol";

contract RegulatorServicePrototype is IRegulatorService, Ownable {
    // Status corresponding to the state of approvement:
    // * Unknown when an address has not been processed yet;
    // * Approved when an address has been approved by contract owner or 3rd party KYC provider;
    // * Suspended means a temporary or permanent suspension of all operations, any KYC providers may
    // set this status when account needs to be re-verified due to legal events or blocked because of fraud.
    enum Status {
        Unknown,
        Approved,
        Suspended
    }

    // Events emitted by this contract
    event ProviderAdded(address indexed addr);
    event ProviderRemoved(address indexed addr);
    event AddrApproved(address indexed addr, address indexed by);
    event AddrSuspended(address indexed addr, address indexed by);

    // Uses status codes from ERC-1066
    byte private constant DISALLOWED = 0x10;
    byte private constant ALLOWED = 0x11;

    // Contract state
    AddrSet.Data private kycProviders;
    mapping(address => Status) public kycStatus;

    constructor() Ownable() {
    }

    // registerProvider adds a new 3rd-party provider that is authorized to perform KYC.
    function registerProvider(address addr) public onlyOwner {
        require(AddrSet.insert(kycProviders, addr), "already registered");
        emit ProviderAdded(addr);
    }

    // removeProvider removes a 3rd-party provider that was authorized to perform KYC.
    function removeProvider(address addr) public onlyOwner {
        require(AddrSet.remove(kycProviders, addr), "not registered");
        emit ProviderRemoved(addr);
    }

    // isProvider returns true if the given address was authorized to perform KYC.
    function isProvider(address addr) public view returns (bool) {
        return addr == owner() || AddrSet.contains(kycProviders, addr);
    }

    // getStatus returns the KYC status for a given address.
    function getStatus(address addr) public view returns (Status) {
        return kycStatus[addr];
    }

    // approveAddr sets the address status to Approved, see Status for details.
    // Can be invoked by owner or authorized KYC providers only.
    function approveAddr(address addr) public onlyAuthorized {
        Status status = kycStatus[addr];
        require(status != Status.Approved, "already approved");
        kycStatus[addr] = Status.Approved;
        emit AddrApproved(addr, msg.sender);
    }

    // suspendAddr sets the address status to Suspended, see Status for details.
    // Can be invoked by owner or authorized KYC providers only.
    function suspendAddr(address addr) public onlyAuthorized {
        Status status = kycStatus[addr];
        require(status != Status.Suspended, "already suspended");
        kycStatus[addr] = Status.Suspended;
        emit AddrSuspended(addr, msg.sender);
    }

    function check(
        address _token,
        address _spender,
        address _from,
        address _to,
        uint256 /*_amount*/
    )
        external
        override
        view
        returns (byte)
    {
        require(_token != address(0), "token address is empty");
        require(_spender != address(0), "spender address is empty");
        require(_from != address(0) || _to != address(0), "undefined account addresses");

        if (getStatus(_spender) != Status.Approved) {
            return DISALLOWED;
        }

        if (_from != address(0)) {
            Status status = getStatus(_from);
            if (_to == address(0)) {
                //tokens can be burned only when the owner's address is suspended
                //this also means that _spender and _from addresses are different
                if (status != Status.Suspended) {
                    return DISALLOWED;
                }

                return ALLOWED;
            }

            if (status != Status.Approved) {
                return DISALLOWED;
            }
        }

        if (getStatus(_to) != Status.Approved) {
            return DISALLOWED;
        }

        return ALLOWED;
    }

    // onlyAuthorized modifier restricts write access to contract owner and authorized KYC providers.
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || AddrSet.contains(kycProviders, msg.sender),
            "onlyAuthorized can do"
        );
        _;
    }
}
