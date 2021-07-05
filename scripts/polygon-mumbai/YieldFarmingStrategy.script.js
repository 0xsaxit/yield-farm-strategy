require('dotenv').config()
//const Tx = require('ethereumjs-tx').Transaction

/// Web3 instance
const Web3 = require('web3')
const provider = new Web3.providers.HttpProvider(`https://polygon-mumbai.infura.io/v3/${ process.env.INFURA_KEY }`)
const web3 = new Web3(provider)

/// Openzeppelin test-helper
const { constants, expectRevert, expectEvent } = require('@openzeppelin/test-helpers')

/// web3.js related methods
const { toWei, fromWei, getEvents, getCurrentBlock, getCurrentTimestamp } = require('../web3js-helper/web3jsHelper')

/// Import deployed-addresses
const contractAddressList = require("../../migrations/addressesList/contractAddress/contractAddress.js")
const tokenAddressList = require("../../migrations/addressesList/tokenAddress/tokenAddress.js")

/// Artifact of smart contracts 
const YieldFarmingStrategyFactory = artifacts.require("YieldFarmingStrategyFactory")
const YieldFarmingStrategy = artifacts.require("YieldFarmingStrategy")
const MasterChef = artifacts.require("MasterChef")
const FishToken = artifacts.require("FishToken")
const IERC20 = artifacts.require("IERC20")
const ILendingPool = artifacts.require("ILendingPool")

/// Deployed-addresses on Polygon Mumbai
const LENDING_POOL_ADDRESSES_PROVIDER = contractAddressList["Polygon Mumbai"]["AAVE"]["LendingPoolAddressesProvider"]
const LENDING_POOL = contractAddressList["Polygon Mumbai"]["AAVE"]["LendingPool"]
const DAI_TOKEN = tokenAddressList["Polygon Mumbai"]["ERC20"]["DAI"]
const VARIABLE_DEBT_MDAI_TOKEN = tokenAddressList["Polygon Mumbai"]["AAVE"]["variableDebtmDAI"]  /// [Note]: Aave Matic Market variable debt mDAI

/// Deployed-addresses on Polygon Mumbai ([Todo]: Finally, it will be replaced with contractAddressList/tokenAddressList)
const YIELD_FARMING_STRATEGY_FACTORY = YieldFarmingStrategyFactory.address
const YIELD_FARMING_STRATEGY
const FISH_TOKEN = FishToken.address
const MASTER_CHEF = MasterChef.address
// const YIELD_FARMING_STRATEGY = contractAddressList["Polygon Mumbai"]["YieldFarmingStrategy"]["YieldFarmingStrategy"]
// const FISH_TOKEN = tokenAddressList["Polygon Mumbai"]["Polycat"]["FishToken"]
// const MASTER_CHEF = contractAddressList["Polygon Mumbai"]["Polycat"]["MasterChef"]

/// Global contract instance
let yieldFarmingStrategyFactory
let yieldFarmingStrategy
let daiToken
let variableDebtmDAI   /// [Note]: Aave Matic Market variable debt mDAI
let fishToken
let masterChef
let lendingPool

/// Acccounts
let deployer


/***
 * @dev - Execution COMMAND: $ npm run script:YieldFarmingStrategy
 *        ($ truffle exec ./scripts/polygon-mumbai/YieldFarmingStrategy.script.js --network polygon_testnet) 
 **/


///-----------------------------------------------
/// Execute all methods
///-----------------------------------------------

/// [Note]: For truffle exec (Remarks: Need to use module.exports)
module.exports = function(callback) {
    main().then(() => callback()).catch(err => callback(err))
}

async function main() {
    console.log("\n------------- Set wallet addresses -------------")
    await setWalletAddress()

    console.log("\n------------- Deploy smart contracts on Polygon mumbai testnet -------------")
    await DeploySmartContracts()
    //await getLpTokenListOfEachPools()

    console.log("\n------------- Workflow of YieldFarmingStrategyFactory contract -------------")
    await createNewYieldFarmingStrategy()

    console.log("\n------------- Workflow of AAVE -------------")
    await lendToAave()
    await collateralizeForAave()
    await borrowFromAave()

    console.log("\n------------- Workflow of the Polycat.finance ------------")
    await addToPolycatPool()
    await depositToPolycatPool()
}


///-----------------------------------------------
/// Methods
///-----------------------------------------------
async function setWalletAddress() {
    console.log("Wallet address should be assigned into deployer")
    deployer = process.env.DEPLOYER_ADDRESS
    //deployer = process.env.EXECUTOR_ADDRESS

    /// [Log]
    console.log('=== deployer ===', deployer)
}

async function DeploySmartContracts() {
    console.log("Create the LendingPool contract instance")
    lendingPool = await ILendingPool.at(LENDING_POOL)

    console.log("Create the DAI token contract instance")
    daiToken = await IERC20.at(DAI_TOKEN)

    console.log("Create the Fish Token contract instance")
    fishToken = await FishToken.at(FISH_TOKEN)

    console.log("Create the MasterChef contract instance")
    masterChef = await MasterChef.at(MASTER_CHEF)

    //console.log("Create the YieldFarmingStrategy contract instance")
    //yieldFarmingStrategy = await YieldFarmingStrategy.at(YIELD_FARMING_STRATEGY)

    console.log("Create the YieldFarmingStrategyFactory contract instance")
    yieldFarmingStrategyFactory = await YieldFarmingStrategyFactory.at(YIELD_FARMING_STRATEGY)

    // console.log("Deploy the Fish Token")
    // fishToken = await FishToken.new({ from: deployer })
    // FISH_TOKEN = fishToken.address

    // console.log("Deploy the MasterChef contract")
    // const startBlock = 1
    // const devAddress = process.env.DEV_ADDRESS
    // const feeAddress = process.env.FEE_ADDRESS
    // const vaultAddress = process.env.VAULT_ADDRESS
    // masterChef = await MasterChef.new(FISH_TOKEN, startBlock, devAddress, feeAddress, vaultAddress, { from: deployer })
    // MASTER_CHEF = masterChef.address

    // console.log("Transfer ownership of the FishToken to the MasterChef contract")
    // let txReceipt = await fishToken.transferOwnership(MASTER_CHEF, { from: deployer })

    // console.log("Deploy the YieldFarmingStrategy contract instance")
    // yieldFarmingStrategy = await YieldFarmingStrategy.new(LENDING_POOL_ADDRESSES_PROVIDER, MASTER_CHEF, DAI_TOKEN, { from: deployer })
    // YIELD_FARMING_STRATEGY = yieldFarmingStrategy.address

    /// [Log]: Deployer-contract addresses
    console.log('\n=== FISH_TOKEN ===', FISH_TOKEN)
    console.log('\n=== DAI_TOKEN ===', DAI_TOKEN)
    console.log('\n=== MASTER_CHEF ===', MASTER_CHEF)
    console.log('\n=== LENDING_POOL_ADDRESSES_PROVIDER ===', LENDING_POOL_ADDRESSES_PROVIDER)            
    //console.log('\n=== YIELD_FARMING_STRATEGY ===', YIELD_FARMING_STRATEGY) 
    console.log('\n=== YIELD_FARMING_STRATEGY_FACTORY ===', YIELD_FARMING_STRATEGY_FACTORY)
}

///------------------------------------------------
/// Pool Info in the MasterChef of Polycat.finance
///------------------------------------------------
async function getLpTokenListOfEachPools() {
    const _poolLength = await masterChef.poolLength()
    const currentPoolLength = Number(String(_poolLength))
    console.log('=== Pool length in the MasterChef ===', currentPoolLength)

    let lpTokenListOfEachPools = []
    for (poolId = 0; poolId < currentPoolLength; ++poolId) {
        const _poolInfo = await masterChef.poolInfo(poolId)
        const lpToken = _poolInfo["0"]
        console.log('=== lpToken of PoolInfo ===', lpToken) 

        lpTokenListOfEachPools.push(lpToken)
    }

    return lpTokenListOfEachPools
}


///---------------------------------------------
/// Workflow of YieldFarmingStrategyFactory.sol
///---------------------------------------------
async function createNewYieldFarmingStrategy() {
    const txReceipt = await yieldFarmingStrategyFactory.createNewYieldFarmingStrategy({ from: deployer })

    /// [Todo]: Retrieve the result the YieldFarmingStrategyCreated event
    let event = await getEvents(yieldFarmingStrategyFactory, "YieldFarmingStrategyCreated")
    YIELD_FARMING_STRATEGY = event.yieldFarmingStrategy
    yieldFarmingStrategy = await YieldFarmingStrategy.at(YIELD_FARMING_STRATEGY)
}


///-------------------------------------
/// Workflow of AAVE
///-------------------------------------
async function lendToAave() {
    const asset = DAI_TOKEN         /// @notice - address of the underlying asset
    const amount = toWei("100")      /// 100 DAI
    // const onBehalfOf = deployer  /// @notice - address whom will receive the aTokens. 
    // const referralCode = 0       /// @notice - Use 0 for no referral.

    /// [Test]: Using lendingPool.deposit() directly
    // let txReceipt1 = await daiToken.approve(LENDING_POOL, amount, { from: deployer })
    // let txReceipt2 = await lendingPool.deposit(asset, amount, onBehalfOf, referralCode, { from: deployer })
    // console.log('=== txReceipt2 (deposit method) ===', txReceipt2)

    /// [Actual code]: Using yieldFarmingStrategy.lendToAave()
    let txReceipt1 = await daiToken.approve(YIELD_FARMING_STRATEGY, amount, { from: deployer })
    let txReceipt2 = await yieldFarmingStrategy.lendToAave(asset, amount, { from: deployer })
    console.log('=== txReceipt2 (lendToAave method) ===', txReceipt2)
}

async function collateralizeForAave() {
    const asset = DAI_TOKEN         /// @notice - address of the underlying asset
    const useAsCollateral = true    /// @notice - "true" if the asset should be used as collateral
    /// [Test]: Using lendingPool.setUserUseReserveAsCollateral() directly
    //let txReceipt = await lendingPool.setUserUseReserveAsCollateral(asset, useAsCollateral, { from: deployer })

    /// [Actual code]: Using yieldFarmingStrategy.collateralToAave()
    let txReceipt = await yieldFarmingStrategy.collateralToAave(asset, { from: deployer })
    console.log('=== txReceipt (setUserUseReserveAsCollateral method) ===', txReceipt)
}

async function borrowFromAave() {
    const asset = DAI_TOKEN         /// @notice - address of the underlying asset
    const amount = toWei("50")      /// 50 DAI (Note: It's possible to borrow DAI until 60% of total collateralized-asset. In this case, 100 DAI is already collateralized. Therefore, It's possible to borrow until 6 DAI)
    const interestRateMode = 2      /// @notice - the type of borrow debt. Stable: 1, Variable: 2
    const referralCode = 0
    const onBehalfOf = deployer

    /// [Test]: Using lendingPool.borrow() directly
    //let txReceipt = await lendingPool.borrow(asset, amount, interestRateMode, referralCode, onBehalfOf, { from: deployer })
    //console.log('=== txReceipt (borrow method) ===', txReceipt)

    /// [Actual code]: Using yieldFarmingStrategy.borrowFromAave()
    let txReceipt = await yieldFarmingStrategy.borrowFromAave(asset, amount, interestRateMode, { from: deployer })
    console.log('=== txReceipt (borrowFromAave method) ===', txReceipt)
}


///-----------------------------------
/// Workflow of the Polycat.finance
///-----------------------------------
async function addToPolycatPool() {
    console.log("Get ERC20 token list of each pools")
    let lpTokenListOfEachPools = await getLpTokenListOfEachPools()

    /// @notice - Only case that there is no pool which has ERC20 token assigned, add() method is executed.
    /// @notice - If the Pool for ERC20 token assigned has not already existed, add() method below is executed.
    if (lpTokenListOfEachPools.indexOf(DAI_TOKEN) == -1) {
        console.log("add() - Add a new ERC20 Token (DAI) Pool as a target")
        /// [Note]: 1 FISH (1e18) tokens are created per block
        const allocPoint = "100"
        const lpToken = DAI_TOKEN   /// [Note]: Using ERC20 Token (DAI) as a single staking pool
        const depositFeeBP = 4      /// [Note]: Deposit Fee == 4%
        let txReceipt = await masterChef.add(allocPoint, lpToken, depositFeeBP, { from: deployer })
        console.log('=== txReceipt (add method of the Polycat.finance) ===', txReceipt)
    }
}

async function depositToPolycatPool() {
    console.log("deposit() - User1 stake 10 DAI at block 310")
    /// [Note]: Block to mint the FishToken start from block 300.
    /// User1 stake (deposit) 10 DAI tokens at block 310.
    const poolId = 0                 /// Pool ID = 0 is the Pool for the DAI
    const stakeAmount = toWei('10')  /// 10 DAI
    const referrer = constants.ZERO_ADDRESS

    /// [Test]: Using masterChef.deposit() directly
    //let txReceipt1 = await daiToken.approve(MASTER_CHEF, stakeAmount, { from: deployer })
    //let txReceipt2 = await masterChef.deposit(poolId, stakeAmount, referrer, { from: deployer })

    /// [Actual code]: Using yieldFarmingStrategy.depositToPolycatPool()
    //let txReceipt1 = await daiToken.approve(YIELD_FARMING_STRATEGY, stakeAmount, { from: deployer })
    let txReceipt2 = await yieldFarmingStrategy.depositToPolycatPool(DAI_TOKEN, poolId, stakeAmount, referrer, { from: deployer })
    console.log('=== txReceipt (deposit method of the Polycat.finance) ===', txReceipt2)
}


///-----------------------------------
/// Check each amount harvested
///-----------------------------------

async function harvestedAmount() {

}
