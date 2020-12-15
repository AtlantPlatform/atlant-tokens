import "./Extensions";
import {
    RegulatorServiceAssertingMockInstance,
    ServiceRegistryInstance,
    TokenPrototypeInstance
} from "../types/truffle-contracts";
import { AllEvents, Transfer } from "../types/truffle-contracts/TokenPrototype";

const Token = artifacts.require("TokenPrototype");
const ServiceRegistry = artifacts.require("ServiceRegistry");
const RegulatorServiceMock = artifacts.require("RegulatorServiceAssertingMock");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const STATUS_ALLOWED = "0x11"

contract("Token", function(accounts: string[]) {
    let initialCap = 1234;
    let owner = accounts[0];
    let instance: TokenPrototypeInstance;
    let serviceRegistry: ServiceRegistryInstance;
    let regulatorServiceMock: RegulatorServiceAssertingMockInstance;

    beforeEach(async () => {
        regulatorServiceMock = await RegulatorServiceMock.new();
        serviceRegistry = await ServiceRegistry.new(regulatorServiceMock.address, {from: owner});
        instance = await Token.new(serviceRegistry.address, initialCap, {from: owner});
    });

    it("deployed state should be valid", async function() {
        await instance.decimals().shouldHaveResult(2);
        await instance.registry().shouldHaveResult(serviceRegistry.address);
        await instance._service().shouldHaveResult(regulatorServiceMock.address);
        await instance.cap().shouldHaveResult(initialCap);
        await instance.totalSupply().shouldHaveResult(0);
        await instance.owner().shouldHaveResult(owner);
    });

    it("mint should be restricted to onlyOwner", async function() {
        let someMinter = accounts[1];
        let address = accounts[2];

        await instance.mint(address, 5, {from: someMinter}).shouldRevertWith("onlyOwner can do");
    });

    it("mint should not make the totalSupply exceed the cap", async function() {
        let address = accounts[2];

        await instance.mint(address, initialCap + 1)
            .shouldRevertWith("totalSupply must not exceed cap");
    });

    it("mint should call RegulatorService and revert", async function() {
        let address = accounts[2];
        let amount = 5;
        let expectedErrorStatus = "0x25";
        await regulatorServiceMock.setAssertions(
            instance.address, owner, ZERO_ADDRESS, address, amount, expectedErrorStatus);

        await instance.mint(address, amount).shouldRevertWith(expectedErrorStatus);
    });

    it("mint should succeed", async function() {
        let address = accounts[2];
        let amount = 5;
        await regulatorServiceMock.setAssertions(
            instance.address, owner, ZERO_ADDRESS, address, amount, STATUS_ALLOWED);

        let result = await instance.mint(address, amount);

        let event = getSingleEvent<Transfer>(result);
        assert.equal(event.args.from, ZERO_ADDRESS);
        assert.equal(event.args.to, address);
        assert.equal(event.args.value, amount);

        await instance.totalSupply().shouldHaveResult(amount);
        await instance.balanceOf(address).shouldHaveResult(amount);
    });


    it("setCap should be restricted to onlyOwner", async function() {
        let notOwner = accounts[1];

        await instance.setCap(5, {from: notOwner}).shouldRevertWith("onlyOwner can do");
    });

    it("setCap less than totalSupply should not be allowed", async function() {
        let address = accounts[2];
        let amount = 5;
        await regulatorServiceMock.setAssertions(
            instance.address, owner, ZERO_ADDRESS, address, amount, STATUS_ALLOWED);
        await instance.mint(address, amount);

        await instance.setCap(amount - 1)
            .shouldRevertWith("cap can not be set less than totalSupply");
    });


    it("checkMintAllowed should call RegulatorService", async function() {
        let sender = accounts[1];
        let to = accounts[2];
        let amount = 5;
        let expectedStatus = STATUS_ALLOWED;
        await regulatorServiceMock.setAssertions(
            instance.address, sender, ZERO_ADDRESS, to, amount, expectedStatus);

        await instance.checkMintAllowed(to, amount, {from: sender})
            .shouldHaveResult(expectedStatus);
    });

    it("checkBurnAllowed should call RegulatorService", async function() {
        let sender = accounts[1];
        let from = accounts[2];
        let amount = 5;
        let expectedStatus = STATUS_ALLOWED;
        await regulatorServiceMock.setAssertions(
            instance.address, sender, from, ZERO_ADDRESS, amount, expectedStatus);

        await instance.checkBurnAllowed(from, amount, {from: sender})
            .shouldHaveResult(expectedStatus);
    });

    it("checkTransferAllowed should call RegulatorService", async function() {
        let from = accounts[2];
        let to = accounts[3];
        let amount = 5;
        let expectedStatus = STATUS_ALLOWED;
        await regulatorServiceMock.setAssertions(
            instance.address, from, from, to, amount, expectedStatus);

        await instance.checkTransferAllowed(from, to, amount)
            .shouldHaveResult(expectedStatus);
    });

    it("checkTransferFromAllowed should call RegulatorService", async function() {
        let sender = accounts[1];
        let from = accounts[2];
        let to = accounts[3];
        let amount = 5;
        let expectedStatus = STATUS_ALLOWED;
        await regulatorServiceMock.setAssertions(
            instance.address, sender, from, to, amount, expectedStatus);

        await instance.checkTransferFromAllowed(from, to, amount, {from: sender})
            .shouldHaveResult(expectedStatus);
    });


    function getSingleEvent<TEvent extends AllEvents>
        (result: Truffle.TransactionResponse<AllEvents>): Truffle.TransactionLog<TEvent>
    {
        assert.equal(result.logs.length, 1);
        var event = result.logs[0] as Truffle.TransactionLog<TEvent>;
        return event;
    }
});
