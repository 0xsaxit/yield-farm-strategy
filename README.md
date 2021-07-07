# ForceDAO Yield Farming Strategy on Polygon
## 【Introduction of the ForceDAO Yield Farming Strategy on Polygon】
- This is a smart contract that deal with a yield farming strategy which use AAVE and Polycat.finance on Polygon.

&nbsp;

***

## 【Workflow】
- ① 
- ②
- ③

- Diagram of workflow: 


&nbsp;

***

## 【Remarks】
- Versions
  - Solidity (Solc): v0.6.12
  - Truffle: v5.1.60
  - web3.js: v1.2.9
  - openzeppelin-solidity: v3.4.1
  - ganache-cli: v6.9.1 (ganache-core: 2.10.2)


&nbsp;

***

## 【Setup】
### ① Install modules
- Install npm modules in the root directory
```
npm install
```

<br>

### ② Compile & migrate contracts (on local)
```
npm run migrate:local
```

<br>

### ③ Script for DEMO
- 1: Get DAI on Polygon mumbai testnet by using the Fancet on Pods
   https://blog.pods.finance/guide-connecting-mumbai-testnet-to-your-metamask-87978071aca8

<br>

- 2: Execute a script
```
npm run script:YieldFarmingStrategy
```

<br>

### ③ Unit test (on local)
- 1: Start ganache-cli
```
$ ganache-cli -d --fork https://polygon-mainnet.infura.io/v3/{YOUR INFURA KEY}@{BLOCK_NUMBER}
```
(※ `-d` option is the option in order to be able to use same address on Ganache-CLI every time)  
(※ Please stop and re-start if an error of `"Returned error: project ID does not have access to archive state"` is displayed)  

<br>

- 2: Execute test of the smart-contracts
```
npm run test:YieldFarmingStrategy
```
( `truffle test ./test/test-local/YieldFarmingStrategy.test.js --network local` )  

<br>

```
npm run test:MasterChef
```
( `truffle test ./test/test-local/polycat/MasterChef.test.js --network local` )  

<br>

***

## 【References】
- ForceDAO


- Prize in GR10 
 https://gitcoin.co/issue/ForceDAO/bounties/4/100025917

