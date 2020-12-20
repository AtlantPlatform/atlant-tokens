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

    describe("isProvider", function() {
        it("should return 'true' for the owner", async function() {
            await instance.isProvider(owner).shouldHaveResult(true);
        });

        it("should return 'false' for an unknown address", async function() {
            let address = accounts[1];

            await instance.isProvider(address).shouldHaveResult(false);
        });
    });

    describe("getStatus", function() {
        it("should return the 'Unknown' status for an unknown address", async function() {
            let address = accounts[1];

            let status = await instance.getStatus(address);
            assert.equal(status.toNumber(), KycStatus.Unknown);
        });
    });

    describe("registerProvider", function() {
        it("should revert when is called not by the owner", async function() {
            let notOwner = accounts[1];
            let provider = accounts[2];

            await instance.registerProvider(provider, {from: notOwner})
                .shouldRevertWith("Ownable: caller is not the owner");
        });

        it("should succeed", async function() {
            let provider = accounts[1];

            let result = await instance.registerProvider(provider);

            var event = getSingleEvent<ProviderAdded>(result);
            assert.equal(event.args.addr, provider);

            await instance.isProvider(provider).shouldHaveResult(true);
        });

        it("should revert on repeat", async function() {
            let provider = accounts[1];

            await instance.registerProvider(provider);
            await instance.registerProvider(provider).shouldRevertWith("already registered");
        });
    });

    describe("removeProvider", function() {
        it("should revert when is called not by the owner", async function() {
            let notOwner = accounts[1];
            let provider = accounts[2];

            await instance.removeProvider(provider, {from: notOwner})
                .shouldRevertWith("Ownable: caller is not the owner");
        });

        it("should revert when the address is not registered as a provider", async function() {
            let provider = accounts[1];

            await instance.removeProvider(provider).shouldRevertWith("not registered");
        });

        it("should succeed", async function() {
            let provider = accounts[1];

            await instance.registerProvider(provider);

            let result = await instance.removeProvider(provider);

            var event = getSingleEvent<ProviderRemoved>(result);
            assert.equal(event.args.addr, provider);

            await instance.isProvider(provider).shouldHaveResult(false);
        });
    });

    describe("approveAddr", function() {
        it("should revert when is called by a not authorized account", async function() {
            let notAuthorized = accounts[1];
            let address = accounts[2];

            await instance.approveAddr(address, {from: notAuthorized})
                .shouldRevertWith("onlyAuthorized can do");
        });

        it("should succeed when is called by the owner", async function() {
            let address = accounts[2];

            await shouldApproveAddr(address, owner);
        });

        it("should succeed when is called by a provider", async function() {
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
            assert.equal(status.toNumber(), KycStatus.Approved);
        }

        it("should revert on repeat", async function() {
            let address = accounts[2];

            await instance.approveAddr(address);

            await instance.approveAddr(address).shouldRevertWith("already approved");
        });
    });

    describe("suspendAddr", function() {
        it("should revert when is called by a not authorized account", async function() {
            let notAuthorized = accounts[1];
            let address = accounts[2];

            await instance.suspendAddr(address, {from: notAuthorized})
                .shouldRevertWith("onlyAuthorized can do");
        });

        it("should succeed when is called by the owner", async function() {
            let address = accounts[2];

            await shouldSuspendAddr(address, owner);
        });

        it("should succeed when is called by a provider", async function() {
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
            assert.equal(status.toNumber(), KycStatus.Suspended);
        }

        it("should revert on repeat", async function() {
            let address = accounts[2];

            await instance.suspendAddr(address);

            await instance.suspendAddr(address).shouldRevertWith("already suspended");
        });
    });

    describe("check", function() {
        it("should revert when token address is zero", async function() {
            await instance.check(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, 0)
                .shouldRevertWith("token address is empty");
        });

        it("should revert when spender address is zero", async function() {
            await instance.check(tokenAddress, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, 0)
                .shouldRevertWith("spender address is empty");
        });

        it("should revert when transfer accounts are zero", async function() {
            let spenderAddress = accounts[1];

            await instance.check(tokenAddress, spenderAddress, ZERO_ADDRESS, ZERO_ADDRESS, 0)
                .shouldRevertWith("undefined account addresses");
        });

        it("should return an error when the spender is not Approved", async function() {
            let spenderAddress = accounts[1];
            let fromAddress = accounts[2];

            await instance.check(tokenAddress, spenderAddress, fromAddress, ZERO_ADDRESS, 0)
                .shouldHaveResult(STATUS_DISALLOWED);
        });

        describe("for transfer", function() {
            it("should return an error when 'from' is not Approved", async function() {
                let spenderAddress = accounts[1];
                let fromAddress = accounts[2];
                let toAddress = accounts[3];

                await instance.approveAddr(spenderAddress);
                await instance.approveAddr(toAddress);

                await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
                    .shouldHaveResult(STATUS_DISALLOWED);
            });

            it("should return an error when 'to' is not Approved", async function() {
                let spenderAddress = accounts[1];
                let fromAddress = accounts[2];
                let toAddress = accounts[3];

                await instance.approveAddr(spenderAddress);
                await instance.approveAddr(fromAddress);

                await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
                    .shouldHaveResult(STATUS_DISALLOWED);
            });

            it("should succeed", async function() {
                let spenderAddress = accounts[1];
                let fromAddress = accounts[2];
                let toAddress = accounts[3];

                await instance.approveAddr(spenderAddress);
                await instance.approveAddr(fromAddress);
                await instance.approveAddr(toAddress);

                await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
                    .shouldHaveResult(STATUS_ALLOWED);
            });
        });

        describe("for mint", function() {
            it("should return an error when 'to' is not Approved", async function() {
                let spenderAddress = accounts[1];
                let fromAddress = ZERO_ADDRESS;
                let toAddress = accounts[3];

                await instance.approveAddr(spenderAddress);

                await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
                    .shouldHaveResult(STATUS_DISALLOWED);
            });

            it("should succeed", async function() {
                let spenderAddress = accounts[1];
                let fromAddress = ZERO_ADDRESS;
                let toAddress = accounts[3];

                await instance.approveAddr(spenderAddress);
                await instance.approveAddr(toAddress);

                await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
                    .shouldHaveResult(STATUS_ALLOWED);
            });
        });

        describe("for burn", function() {
            it("should return an error when 'from' is not Suspended", async function() {
                let spenderAddress = accounts[1];
                let fromAddress = accounts[2];
                let toAddress = ZERO_ADDRESS;

                await instance.approveAddr(spenderAddress);

                await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
                    .shouldHaveResult(STATUS_DISALLOWED);
            });

            it("should succeed", async function() {
                let spenderAddress = accounts[1];
                let fromAddress = accounts[2];
                let toAddress = ZERO_ADDRESS;

                await instance.approveAddr(spenderAddress);
                await instance.suspendAddr(fromAddress);

                await instance.check(tokenAddress, spenderAddress, fromAddress, toAddress, 0)
                    .shouldHaveResult(STATUS_ALLOWED);
            });
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
