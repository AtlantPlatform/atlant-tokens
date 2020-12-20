all:

compile: # the main contracts
	docker run -v $(CURDIR):/sources ethereum/solc:0.7.5 @openzeppelin/contracts/=/sources/node_modules/@openzeppelin/contracts/ -o /sources/bin --bin --overwrite /sources/contracts/RegulatorServicePrototype.sol
	docker run -v $(CURDIR):/sources ethereum/solc:0.7.5 @openzeppelin/contracts/=/sources/node_modules/@openzeppelin/contracts/ -o /sources/bin --bin --overwrite /sources/contracts/TokenPrototype.sol

lint:
	#solhint "contracts/**/*.sol"
	solium -d contracts/
