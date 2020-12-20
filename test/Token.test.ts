import "./Extensions";
import {
    RegulatorServiceAssertingMockInstance,
    ServiceRegistryInstance,
    TokenPrototypeInstance
} from "../types/truffle-contracts";
import { AllEvents, DocumentUpdated, Transfer } from "../types/truffle-contracts/TokenPrototype";

const Token = artifacts.require("TokenPrototype");
const ServiceRegistry = artifacts.require("ServiceRegistry");
const RegulatorServiceMock = artifacts.require("RegulatorServiceAssertingMock");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const STATUS_ALLOWED = "0x11"

contract("Token", function(accounts: string[]) {
    let tokenName = "Token Name";
    let tokenSymbol = "Token Symbol";
    let initialCap = 1234;
    let owner = accounts[0];
    let instance: TokenPrototypeInstance;
    let serviceRegistry: ServiceRegistryInstance;
    let regulatorServiceMock: RegulatorServiceAssertingMockInstance;

    beforeEach(async () => {
        regulatorServiceMock = await RegulatorServiceMock.new();
        serviceRegistry = await ServiceRegistry.new(regulatorServiceMock.address, {from: owner});
        instance = await Token.new(
            serviceRegistry.address, initialCap, tokenName, tokenSymbol, {from: owner});
    });

    it("should have a valid deployed state", async function() {
        await instance.name().shouldHaveResult(tokenName);
        await instance.symbol().shouldHaveResult(tokenSymbol);
        await instance.decimals().shouldHaveResult(2);
        await instance.registry().shouldHaveResult(serviceRegistry.address);
        await instance._service().shouldHaveResult(regulatorServiceMock.address);
        await instance.cap().shouldHaveResult(initialCap);
        await instance.totalSupply().shouldHaveResult(0);
        await instance.owner().shouldHaveResult(owner);
    });

    describe("mint", function() {
        it("should revert when is called not by the owner", async function() {
            let someMinter = accounts[1];
            let address = accounts[2];

            await instance.mint(address, 5, {from: someMinter})
                .shouldRevertWith("Ownable: caller is not the owner");
        });

        it("should revert if the totalSupply would exceed the cap", async function() {
            let address = accounts[2];

            await instance.mint(address, initialCap + 1)
                .shouldRevertWith("totalSupply must not exceed cap");
        });

        it("should call RegulatorService and revert", async function() {
            let address = accounts[2];
            let amount = 5;
            let expectedErrorStatus = "0x25";
            await regulatorServiceMock.setAssertions(
                instance.address, owner, ZERO_ADDRESS, address, amount, expectedErrorStatus);

            await instance.mint(address, amount).shouldRevertWith(expectedErrorStatus);
        });

        it("should succeed", async function() {
            let address = accounts[2];
            let amount = 5;
            await regulatorServiceMock.setAssertions(
                instance.address, owner, ZERO_ADDRESS, address, amount, STATUS_ALLOWED);

            let result = await instance.mint(address, amount);

            let event = getSingleEvent<Transfer>(result);
            assert.equal(event.args.from, ZERO_ADDRESS);
            assert.equal(event.args.to, address);
            assert.equal(event.args.value.toNumber(), amount);

            await instance.totalSupply().shouldHaveResult(amount);
            await instance.balanceOf(address).shouldHaveResult(amount);
        });
    });

    describe("setCap", function() {
        it("should revert when is called not by the owner", async function() {
            let notOwner = accounts[1];

            await instance.setCap(5, {from: notOwner})
                .shouldRevertWith("Ownable: caller is not the owner");
        });

        it("should revert when the value is less than the totalSupply", async function() {
            let address = accounts[2];
            let amount = 5;
            await regulatorServiceMock.setAssertions(
                instance.address, owner, ZERO_ADDRESS, address, amount, STATUS_ALLOWED);
            await instance.mint(address, amount);

            await instance.setCap(amount - 1)
                .shouldRevertWith("cap can not be set less than totalSupply");
        });
    });

    describe("burn", function() {
        it("should call RegulatorService and revert", async function() {
            let address = accounts[2];
            let amount = 5;
            let expectedErrorStatus = "0x25";
            await regulatorServiceMock.setAssertions(
                instance.address, owner, address, ZERO_ADDRESS, amount, expectedErrorStatus);

            await instance.burn(address, amount).shouldRevertWith(expectedErrorStatus);
        });
    });

    describe("transfer", function() {
        it("should call RegulatorService and revert", async function() {
            let from = accounts[1];
            let to = accounts[2];
            let amount = 5;
            let expectedErrorStatus = "0x25";
            await regulatorServiceMock.setAssertions(
                instance.address, from, from, to, amount, expectedErrorStatus);

            await instance.transfer(to, amount, {from: from})
                .shouldRevertWith(expectedErrorStatus);
        });
    });

    describe("transferFrom", function() {
        it("should call RegulatorService and revert", async function() {
            let from = accounts[1];
            let to = accounts[2];
            let amount = 5;
            let expectedErrorStatus = "0x25";
            await regulatorServiceMock.setAssertions(
                instance.address, owner, from, to, amount, expectedErrorStatus);

            await instance.transferFrom(from, to, amount, {from: owner})
                .shouldRevertWith(expectedErrorStatus);
        });
    });

    describe("checkMintAllowed", function() {
        it("should call RegulatorService", async function() {
            let sender = accounts[1];
            let to = accounts[2];
            let amount = 5;
            let expectedStatus = STATUS_ALLOWED;
            await regulatorServiceMock.setAssertions(
                instance.address, sender, ZERO_ADDRESS, to, amount, expectedStatus);

            await instance.checkMintAllowed(to, amount, {from: sender})
                .shouldHaveResult(expectedStatus);
        });
    });

    describe("checkBurnAllowed", function() {
        it("should call RegulatorService", async function() {
            let sender = accounts[1];
            let from = accounts[2];
            let amount = 5;
            let expectedStatus = STATUS_ALLOWED;
            await regulatorServiceMock.setAssertions(
                instance.address, sender, from, ZERO_ADDRESS, amount, expectedStatus);

            await instance.checkBurnAllowed(from, amount, {from: sender})
                .shouldHaveResult(expectedStatus);
        });
    });

    describe("checkTransferAllowed", function() {
        it("should call RegulatorService", async function() {
            let from = accounts[2];
            let to = accounts[3];
            let amount = 5;
            let expectedStatus = STATUS_ALLOWED;
            await regulatorServiceMock.setAssertions(
                instance.address, from, from, to, amount, expectedStatus);

            await instance.checkTransferAllowed(from, to, amount)
                .shouldHaveResult(expectedStatus);
        });
    });

    describe("checkTransferFromAllowed", function() {
        it("should call RegulatorService", async function() {
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
    });

    describe("attachDocument", function() {
        it("should revert when the name is empty", async function() {
            let name = web3.utils.fromAscii("");
            let uri = "/123";
            let contentHash = "0x1";

            await instance.attachDocument(name, uri, contentHash)
                .shouldRevertWith("name is required");
        });

        it("should revert when the uri is empty", async function() {
            let name = web3.utils.fromAscii("123");
            let uri = "";
            let contentHash = "0x1";

            await instance.attachDocument(name, uri, contentHash)
                .shouldRevertWith("uri is required");
        });

        it("should revert when the constentHash is empty", async function() {
            let name = web3.utils.fromAscii("123");
            let uri = "/123";
            let contentHash = "0x0";

            await instance.attachDocument(name, uri, contentHash)
                .shouldRevertWith("content hash is required");
        });

        it("should succeed", async function() {
            let notOwner = accounts[1];
            let name = web3.utils.fromAscii("123");
            let uri = "/123";
            let contentHash = "0x1";

            let result = await instance.attachDocument(name, uri, contentHash, {from: notOwner});

            //bytes32 solidity type
            let expectedName = name.padEnd(66, '0');
            let expectedHash = contentHash.padEnd(66, '0');

            let event = getSingleEvent<DocumentUpdated>(result);
            assert.equal(event.args.name, expectedName, "event: document name mismatch");
            assert.equal(event.args.uri, uri, "event: document uri mismatch");
            assert.equal(event.args.contentHash, expectedHash,
                "event: document contentHash mismatch");

            let document = await instance.lookupDocument(name);
            assert.equal(document[0], uri, "lookup: document uri mismatch");
            assert.equal(document[1], expectedHash, "lookup: document contentHash mismatch");
        });

        it("should keep document names unique", async function() {
            let name = web3.utils.fromAscii("123");
            let uri = "/123";
            let contentHash = "0x1";

            await instance.attachDocument(name, uri, contentHash);
            await instance.attachDocument(name, "newuri", "0x2")
                .shouldRevertWith("document already exists");
        });
    });

    describe("renounceOwnership", function() {
        it("should always revert", async function() {
            await instance.renounceOwnership().shouldRevertWith("not supported");
        });
    });


    function getSingleEvent<TEvent extends AllEvents>
        (result: Truffle.TransactionResponse<AllEvents>): Truffle.TransactionLog<TEvent>
    {
        assert.equal(result.logs.length, 1);
        var event = result.logs[0] as Truffle.TransactionLog<TEvent>;
        return event;
    }
});
