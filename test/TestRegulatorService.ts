import "./Extensions";
import {
    AddrApproved,
    AddrSuspended,
    AllEvents,
    ProviderAdded,
    ProviderRemoved,
    RegulatorServicePrototypeInstance
} from "../types/truffle-contracts/RegulatorServicePrototype";

const RegulatorService = artifacts.require("RegulatorServicePrototype");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const STATUS_DISALLOWED = "0x10"
const STATUS_ALLOWED = "0x11"

enum KycStatus {
    Unknown = 0,
    Approved = 1,
    Suspended = 2,
}

contract("RegulatorService", function(accounts: string[]) {
    let instance: RegulatorServicePrototypeInstance;
    let owner = accounts[0];
    let tokenAddress = "0x1000000000000000000000000000000000000000";

    beforeEach(async () => {
        instance = await RegulatorService.new({from: owner});
    });


    it("owner should be a provider", async function() {
        await instance.isProvider(owner).shouldHaveResult(true);
    });

    it("others should not be providers", async function() {
        let address = accounts[1];

        await instance.isProvider(address).shouldHaveResult(false);
    });


    it("registerProvider should be restricted to onlyOwner", async function() {
        let notOwner = accounts[1];
        let provider = accounts[2];

        await instance.registerProvider(provider, {from: notOwner})
            .shouldRevertWith("onlyOwner can do");
    });

    it("registerProvider should succeed", async function() {
        let provider = accounts[1];

        let result = await instance.registerProvider(provider);

        var event = getSingleEvent<ProviderAdded>(result);
        assert.equal(event.args.addr, provider);

        await instance.isProvider(provider).shouldHaveResult(true);
    });

    it("registerProvider should revert on repeat", async function() {
        let provider = accounts[1];

        await instance.registerProvider(provider);
        await instance.registerProvider(provider).shouldRevertWith("already registered");
    });


    it("removeProvider should be restricted to onlyOwner", async function() {
        let notOwner = accounts[1];
        let provider = accounts[2];

        await instance.removeProvider(provider, {from: notOwner})
            .shouldRevertWith("onlyOwner can do");
    });

    it("removeProvider should revert on not registered", async function() {
        let provider = accounts[1];

        await instance.removeProvider(provider).shouldRevertWith("not registered");
    });

    it("removeProvider should succeed", async function() {
        let provider = accounts[1];

        await instance.registerProvider(provider);

        let result = await instance.removeProvider(provider);

        var event = getSingleEvent<ProviderRemoved>(result);
        assert.equal(event.args.addr, provider);

        await instance.isProvider(provider).shouldHaveResult(false);
    });


    it("getStatus should return unknown", async function() {
        let address = accounts[1];

        let status = await instance.getStatus(address);
        assert.equal(status, KycStatus.Unknown);
    });


    it("approveAddr should be restricted to onlyAuthorized", async function() {
        let notAuthorized = accounts[1];
        let address = accounts[2];

        await instance.approveAddr(address, {from: notAuthorized})
            .shouldRevertWith("onlyAuthorized can do");
    });

    it("approveAddr should succeed by owner", async function() {
        let address = accounts[2];

        await shouldApproveAddr(address, owner);
    });

    it("approveAddr should succeed by provider", async function() {
        let provider = accounts[1];
        let address = accounts[2];

        await instance.registerProvider(provider);

        await shouldApproveAddr(address, provider);
    });

    async function shouldApproveAddr(address: string, by: string) {
        let result = await instance.approveAddr(address, {from: by});

        var event = getSingleEvent<AddrApproved>(result);
        assert.equal(event.args.addr, address);
        assert.equal(event.args.by, by);

        let status = await instance.getStatus(address);
        assert.equal(status, KycStatus.Approved);
    }

    it("approveAddr should revert on repeat", async function() {
        let address = accounts[2];

        await instance.approveAddr(address);

        await instance.approveAddr(address).shouldRevertWith("already approved");
    });


    it("suspendAddr should be restricted to onlyAuthorized", async function() {
        let notAuthorized = accounts[1];
        let address = accounts[2];

        await instance.suspendAddr(address, {from: notAuthorized})
            .shouldRevertWith("onlyAuthorized can do");
    });

    it("suspendAddr should succeed by owner", async function() {
        let address = accounts[2];

        await shouldSuspendAddr(address, owner);
    });

    it("suspendAddr should succeed by provider", async function() {
        let provider = accounts[1];
        let address = accounts[2];

        await instance.registerProvider(provider);

        await shouldSuspendAddr(address, provider);
    });

    async function shouldSuspendAddr(address: string, by: string) {
        let result = await instance.suspendAddr(address, {from: by});

        var event = getSingleEvent<AddrSuspended>(result);
        assert.equal(event.args.addr, address);
        assert.equal(event.args.by, by);

        let status = await instance.getStatus(address);
        assert.equal(status, KycStatus.Suspended);
    }

    it("suspendAddr should revert on repeat", async function() {
        let address = accounts[2];

        await instance.suspendAddr(address);

        await instance.suspendAddr(address).shouldRevertWith("already suspended");
    });


    it("check should revert on empty token address", async function() {
        await instance.check(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, 0)
            .shouldRevertWith("token address is empty");
    });

    it("check should revert on empty spender address", async function() {
        await instance.check(tokenAddress, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, 0)
            .shouldRevertWith("spender address is empty");
    });

    it("check should revert on undefined accounts", async function() {
        let spenderAddress = accounts[1];

        await instance.check(tokenAddress, spenderAddress, ZERO_ADDRESS, ZERO_ADDRESS, 0)
            .shouldRevertWith("undefined account addresses");
    });

    it("check should return error on unapproved spender", async function() {
        let spenderAddress = accounts[1];
        let fromAddress = accounts[2];

        await instance.check(tokenAddress, spenderAddress, fromAddress, ZERO_ADDRESS, 0)
            .shouldHaveResult(STATUS_DISALLOWED);
    });

    it("check transfer should return error on unapproved from", async function() {
        let spenderAddress = accounts[1];
        let fromAddress = accounts[2];
        let toAddress = accounts[3];

        await instance.approveAddr(spenderAddress);
        await instance.approveAddr(toAddress);

        await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
            .shouldHaveResult(STATUS_DISALLOWED);
    });

    it("check transfer should return error on unapproved to", async function() {
        let spenderAddress = accounts[1];
        let fromAddress = accounts[2];
        let toAddress = accounts[3];

        await instance.approveAddr(spenderAddress);
        await instance.approveAddr(fromAddress);

        await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
            .shouldHaveResult(STATUS_DISALLOWED);
    });

    it("check transfer should succeed", async function() {
        let spenderAddress = accounts[1];
        let fromAddress = accounts[2];
        let toAddress = accounts[3];

        await instance.approveAddr(spenderAddress);
        await instance.approveAddr(fromAddress);
        await instance.approveAddr(toAddress);

        await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
            .shouldHaveResult(STATUS_ALLOWED);
    });

    it("check mint should return error on unapproved to", async function() {
        let spenderAddress = accounts[1];
        let fromAddress = ZERO_ADDRESS;
        let toAddress = accounts[3];

        await instance.approveAddr(spenderAddress);

        await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
            .shouldHaveResult(STATUS_DISALLOWED);
    });

    it("check mint should succeed", async function() {
        let spenderAddress = accounts[1];
        let fromAddress = ZERO_ADDRESS;
        let toAddress = accounts[3];

        await instance.approveAddr(spenderAddress);
        await instance.approveAddr(toAddress);

        await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
            .shouldHaveResult(STATUS_ALLOWED);
    });

    it("check burn should return error on unsuspended from", async function() {
        let spenderAddress = accounts[1];
        let fromAddress = accounts[2];
        let toAddress = ZERO_ADDRESS;

        await instance.approveAddr(spenderAddress);

        await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
            .shouldHaveResult(STATUS_DISALLOWED);
    });

    it("check burn should succeed", async function() {
        let spenderAddress = accounts[1];
        let fromAddress = accounts[2];
        let toAddress = ZERO_ADDRESS;

        await instance.approveAddr(spenderAddress);
        await instance.suspendAddr(fromAddress);

        await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
            .shouldHaveResult(STATUS_ALLOWED);
    });


    function getSingleEvent<TEvent extends AllEvents>
        (result: Truffle.TransactionResponse<AllEvents>): Truffle.TransactionLog<TEvent>
    {
        assert.equal(result.logs.length, 1);
        var event = result.logs[0] as Truffle.TransactionLog<TEvent>;
        return event;
    }
});
