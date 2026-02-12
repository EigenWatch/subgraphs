import {
  Deposit as DepositEvent,
  StrategyAddedToDepositWhitelist,
  StrategyRemovedFromDepositWhitelist,
  StrategyWhitelisterChanged,
  BurnOrRedistributableSharesIncreased,
  BurnOrRedistributableSharesDecreased,
  BurnableSharesDecreased,
} from "../generated/StrategyManager/StrategyManager";

import {
  // Minimal lookup entities
  Staker,
  Strategy,
  OperatorSet,
  // Event entities only
  Deposit,
  StrategyWhitelisterChanged as StrategyWhitelisterChangedEntity,
  StrategyWhitelistEvent,
  BurnOrRedistributableSharesIncreased as BurnOrRedistributableSharesIncreasedEntity,
  BurnOrRedistributableSharesDecreased as BurnOrRedistributableSharesDecreasedEntity,
  BurnableSharesDecreased as BurnableSharesDecreasedEntity,
  AVS,
} from "../generated/schema";
import { Strategy as StrategyTemplate } from "../generated/templates";

import { log, Address, BigInt } from "@graphprotocol/graph-ts";

// ========================================
// DEPOSIT EVENTS
// ========================================

export function handleDeposit(event: DepositEvent): void {
  log.info("Processing Deposit event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // DATA QUALITY GUARD: Staker address must not be zero
  if (event.params.staker.equals(Address.zero())) {
    log.critical("INVARIANT VIOLATION: Deposit with zero staker at tx {}", [
      event.transaction.hash.toHexString(),
    ]);
  }

  // Create minimal lookup entities if needed
  let staker = getOrCreateStaker(event.params.staker);
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let deposit = new Deposit(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  deposit.transactionHash = event.transaction.hash;
  deposit.logIndex = event.logIndex;
  deposit.blockNumber = event.block.number;
  deposit.blockTimestamp = event.block.timestamp;
  deposit.contractAddress = event.address;

  // Event-specific fields
  deposit.staker = staker.id;
  deposit.strategy = strategy.id;
  deposit.shares = event.params.shares;

  // Save entities
  staker.save();
  strategy.save();
  deposit.save();

  log.info("Deposit event saved: {}", [deposit.id]);
}

// ========================================
// STRATEGY WHITELIST EVENTS
// ========================================

export function handleStrategyWhitelisterChanged(
  event: StrategyWhitelisterChanged,
): void {
  log.info("Processing StrategyWhitelisterChanged event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let whitelisterEvent = new StrategyWhitelisterChangedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  whitelisterEvent.transactionHash = event.transaction.hash;
  whitelisterEvent.logIndex = event.logIndex;
  whitelisterEvent.blockNumber = event.block.number;
  whitelisterEvent.blockTimestamp = event.block.timestamp;
  whitelisterEvent.contractAddress = event.address;

  // Event-specific fields
  whitelisterEvent.previousAddress = event.params.previousAddress;
  whitelisterEvent.newAddress = event.params.newAddress;

  whitelisterEvent.save();

  log.info("StrategyWhitelisterChanged event saved: {}", [whitelisterEvent.id]);
}

export function handleStrategyAddedToDepositWhitelist(
  event: StrategyAddedToDepositWhitelist,
): void {
  log.info("Processing StrategyAddedToDepositWhitelist event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let whitelistEvent = new StrategyWhitelistEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  whitelistEvent.transactionHash = event.transaction.hash;
  whitelistEvent.logIndex = event.logIndex;
  whitelistEvent.blockNumber = event.block.number;
  whitelistEvent.blockTimestamp = event.block.timestamp;
  whitelistEvent.contractAddress = event.address;

  // Event-specific fields
  whitelistEvent.strategy = strategy.id;
  whitelistEvent.eventType = "ADDED";

  // Save entities
  strategy.save();
  whitelistEvent.save();

  log.info("StrategyAddedToDepositWhitelist event saved: {}", [
    whitelistEvent.id,
  ]);

  // Dynamically index the new strategy
  StrategyTemplate.create(event.params.strategy);
}

export function handleStrategyRemovedFromDepositWhitelist(
  event: StrategyRemovedFromDepositWhitelist,
): void {
  log.info("Processing StrategyRemovedFromDepositWhitelist event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let whitelistEvent = new StrategyWhitelistEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  whitelistEvent.transactionHash = event.transaction.hash;
  whitelistEvent.logIndex = event.logIndex;
  whitelistEvent.blockNumber = event.block.number;
  whitelistEvent.blockTimestamp = event.block.timestamp;
  whitelistEvent.contractAddress = event.address;

  // Event-specific fields
  whitelistEvent.strategy = strategy.id;
  whitelistEvent.eventType = "REMOVED";

  // Save entities
  strategy.save();
  whitelistEvent.save();

  log.info("StrategyRemovedFromDepositWhitelist event saved: {}", [
    whitelistEvent.id,
  ]);
}

// ========================================
// SLASHING RESOLUTION EVENTS
// ========================================

export function handleBurnOrRedistributableSharesIncreased(
  event: BurnOrRedistributableSharesIncreased,
): void {
  log.info("Processing BurnOrRedistributableSharesIncreased event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let burnableEvent = new BurnOrRedistributableSharesIncreasedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  burnableEvent.transactionHash = event.transaction.hash;
  burnableEvent.logIndex = event.logIndex;
  burnableEvent.blockNumber = event.block.number;
  burnableEvent.blockTimestamp = event.block.timestamp;
  burnableEvent.contractAddress = event.address;

  // Event-specific fields
  burnableEvent.operatorSet = operatorSet.id;
  burnableEvent.slashId = event.params.slashId;
  burnableEvent.strategy = strategy.id;
  burnableEvent.shares = event.params.shares;

  // Save entities
  operatorSet.save();
  strategy.save();
  burnableEvent.save();

  log.info("BurnOrRedistributableSharesIncreased event saved: {}", [
    burnableEvent.id,
  ]);
}

export function handleBurnOrRedistributableSharesDecreased(
  event: BurnOrRedistributableSharesDecreased,
): void {
  log.info("Processing BurnOrRedistributableSharesDecreased event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let burnableEvent = new BurnOrRedistributableSharesDecreasedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  burnableEvent.transactionHash = event.transaction.hash;
  burnableEvent.logIndex = event.logIndex;
  burnableEvent.blockNumber = event.block.number;
  burnableEvent.blockTimestamp = event.block.timestamp;
  burnableEvent.contractAddress = event.address;

  // Event-specific fields
  burnableEvent.operatorSet = operatorSet.id;
  burnableEvent.slashId = event.params.slashId;
  burnableEvent.strategy = strategy.id;
  burnableEvent.shares = event.params.shares;

  // Save entities
  operatorSet.save();
  strategy.save();
  burnableEvent.save();

  log.info("BurnOrRedistributableSharesDecreased event saved: {}", [
    burnableEvent.id,
  ]);
}

export function handleBurnableSharesDecreased(
  event: BurnableSharesDecreased,
): void {
  log.info("Processing BurnableSharesDecreased event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let burnableEvent = new BurnableSharesDecreasedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  burnableEvent.transactionHash = event.transaction.hash;
  burnableEvent.logIndex = event.logIndex;
  burnableEvent.blockNumber = event.block.number;
  burnableEvent.blockTimestamp = event.block.timestamp;
  burnableEvent.contractAddress = event.address;

  // Event-specific fields
  burnableEvent.strategy = strategy.id;
  burnableEvent.shares = event.params.shares;

  // Save entities
  strategy.save();
  burnableEvent.save();

  log.info("BurnableSharesDecreased event saved: {}", [burnableEvent.id]);
}

// ========================================
// MINIMAL HELPER FUNCTIONS
// ========================================

function getOrCreateStaker(address: Address): Staker {
  let staker = Staker.load(address.toHexString());
  if (staker == null) {
    staker = new Staker(address.toHexString());
    staker.address = address;
  }
  return staker;
}

function getOrCreateStrategy(address: Address): Strategy {
  let strategy = Strategy.load(address.toHexString());
  if (strategy == null) {
    strategy = new Strategy(address.toHexString());
    strategy.address = address;
  }
  return strategy;
}

function getOrCreateAVS(address: Address): AVS {
  let avs = AVS.load(address.toHexString());
  if (avs == null) {
    avs = new AVS(address.toHexString());
    avs.address = address;
  }
  return avs;
}

function getOrCreateOperatorSet(
  avsAddress: Address,
  operatorSetId: BigInt,
): OperatorSet {
  let id = avsAddress.toHexString() + "-" + operatorSetId.toString();
  let operatorSet = OperatorSet.load(id);
  if (operatorSet == null) {
    operatorSet = new OperatorSet(id);
    operatorSet.avs = avsAddress.toHexString();
    operatorSet.operatorSetId = operatorSetId;

    // Ensure AVS exists
    let avs = getOrCreateAVS(avsAddress);
    avs.save();
  }
  return operatorSet;
}
