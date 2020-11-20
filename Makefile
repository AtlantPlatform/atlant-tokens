all:

init:
	mkdir -p var
	geth --datadir=var/chain/ init var/genesis.json

node:
	geth --datadir=var/chain/ --rpc

attach:
	geth attach var/chain/geth.ipc

compile: # the main contract
	#solc contracts/BaseSecurityToken.sol
	docker run -v $(CURDIR):/sources ethereum/solc:0.5.16 -o /sources/bin --abi --bin --overwrite /sources/contracts/RegulatorServicePrototype.sol
	docker run -v $(CURDIR):/sources ethereum/solc:0.5.16 -o /sources/bin --abi --bin --overwrite /sources/contracts/TokenPrototype.sol

lint:
	#solhint "contracts/**/*.sol"
	solium -d contracts/
