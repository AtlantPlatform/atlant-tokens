all:

init:
	mkdir -p var
	docker run -v $(CURDIR)/var:/var ethereum/client-go:v1.9.2 --datadir=/var/chain/ init /var/genesis.json

node:
	#geth --datadir=var/chain/ --rpc
	docker run -v $(CURDIR)/var:/var -p 127.0.0.1:8545:8545/tcp ethereum/client-go:v1.9.2 --datadir=/var/chain/ --networkid 15 --nodiscover --rpc --rpcaddr "0.0.0.0"

attach:
	geth attach var/chain/geth.ipc

compile: # the main contract
	#solc contracts/BaseSecurityToken.sol
	docker run -v $(CURDIR):/sources ethereum/solc:0.5.16 -o /sources/bin --abi --bin --overwrite /sources/contracts/RegulatorServicePrototype.sol
	docker run -v $(CURDIR):/sources ethereum/solc:0.5.16 -o /sources/bin --abi --bin --overwrite /sources/contracts/TokenPrototype.sol

lint:
	#solhint "contracts/**/*.sol"
	solium -d contracts/
