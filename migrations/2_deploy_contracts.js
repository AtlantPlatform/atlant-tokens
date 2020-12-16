const RegulatorService = artifacts.require("RegulatorServicePrototype");
const ServiceRegistry = artifacts.require("ServiceRegistry");
const Token = artifacts.require("TokenPrototype");

module.exports = async function(deployer) {
    //TODO: prepare for dev and prod
    await deployer.deploy(RegulatorService);

    let regulatorServiceInstance = await RegulatorService.deployed();
    await deployer.deploy(ServiceRegistry, regulatorServiceInstance.address);

    let serviceRegistryInstance = await ServiceRegistry.deployed();
    await deployer.deploy(Token, serviceRegistryInstance.address, 0, "Name", "Symbol");
};
