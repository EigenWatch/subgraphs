import {
  Deposit as DepositEvent,
  StrategyAddedToDepositWhitelist,
  StrategyRemovedFromDepositWhitelist,
  BurnOrRedistributableSharesIncreased,
  BurnOrRedistributableSharesDecreased,
  BurnableSharesDecreased,
} from "../generated/StrategyManager/StrategyManager";

import {
  Staker,
  Strategy,
  Deposit,
  StrategyWhitelistEvent,
} from "../generated/schema";

import { BigInt, log, Address } from "@graphprotocol/graph-ts";

// ========================================
// DEPOSIT TRACKING (UNDERSTAND STAKER BEHAVIOR)
// ========================================

export function handleDeposit(event: DepositEvent): void {
  log.info("Processing Deposit: staker {} strategy {} shares {}", [
    event.params.staker.toHexString(),
    event.params.strategy.toHexString(),
    event.params.shares.toString(),
  ]);

  // Get or create entities
  let staker = getOrCreateStaker(event.params.staker, event.block.timestamp);
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  // Update staker metrics
  staker.lastActivityAt = event.block.timestamp;

  // Update strategy metrics
  strategy.totalDeposits = strategy.totalDeposits.plus(BigInt.fromI32(1));
  strategy.totalShares = strategy.totalShares.plus(event.params.shares);
  strategy.lastActivityAt = event.block.timestamp;

  // Set first deposit timestamp if this is the first deposit
  if (strategy.firstDepositAt == null) {
    strategy.firstDepositAt = event.block.timestamp;
  }

  // Create deposit event
  let deposit = new Deposit(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  deposit.transactionHash = event.transaction.hash;
  deposit.logIndex = event.logIndex;
  deposit.blockNumber = event.block.number;
  deposit.blockTimestamp = event.block.timestamp;
  deposit.contractAddress = event.address;
  deposit.staker = staker.id;
  deposit.strategy = strategy.id;
  deposit.shares = event.params.shares;

  // Save entities
  staker.save();
  strategy.save();
  deposit.save();

  log.info("Deposit processed successfully", []);
}

// ========================================
// STRATEGY LIFECYCLE (AFFECTS AVAILABLE OPTIONS)
// ========================================

export function handleStrategyAddedToDepositWhitelist(
  event: StrategyAddedToDepositWhitelist
): void {
  log.info("Processing StrategyAddedToDepositWhitelist: strategy {}", [
    event.params.strategy.toHexString(),
  ]);

  // Get or create strategy
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  // Update whitelist status
  strategy.isWhitelisted = true;
  strategy.whitelistedAt = event.block.timestamp;
  strategy.lastActivityAt = event.block.timestamp;

  // Create whitelist event
  let whitelistEvent = new StrategyWhitelistEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  whitelistEvent.transactionHash = event.transaction.hash;
  whitelistEvent.logIndex = event.logIndex;
  whitelistEvent.blockNumber = event.block.number;
  whitelistEvent.blockTimestamp = event.block.timestamp;
  whitelistEvent.contractAddress = event.address;
  whitelistEvent.strategy = strategy.id;
  whitelistEvent.eventType = "ADDED";

  // Save entities
  strategy.save();
  whitelistEvent.save();

  log.info("StrategyAddedToDepositWhitelist processed successfully", []);
}

export function handleStrategyRemovedFromDepositWhitelist(
  event: StrategyRemovedFromDepositWhitelist
): void {
  log.info("Processing StrategyRemovedFromDepositWhitelist: strategy {}", [
    event.params.strategy.toHexString(),
  ]);

  // Load strategy (should exist if it was previously whitelisted)
  let strategy = Strategy.load(event.params.strategy.toHexString());
  if (strategy == null) {
    log.warning("Strategy not found for whitelist removal: {}", [
      event.params.strategy.toHexString(),
    ]);
    // Create it anyway to track the removal event
    strategy = getOrCreateStrategy(
      event.params.strategy,
      event.block.timestamp
    );
  }

  // Update whitelist status
  strategy.isWhitelisted = false;
  strategy.whitelistedAt = null; // Clear the whitelisted timestamp
  strategy.lastActivityAt = event.block.timestamp;

  // Create whitelist event
  let whitelistEvent = new StrategyWhitelistEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  whitelistEvent.transactionHash = event.transaction.hash;
  whitelistEvent.logIndex = event.logIndex;
  whitelistEvent.blockNumber = event.block.number;
  whitelistEvent.blockTimestamp = event.block.timestamp;
  whitelistEvent.contractAddress = event.address;
  whitelistEvent.strategy = strategy.id;
  whitelistEvent.eventType = "REMOVED";

  // Save entities
  strategy.save();
  whitelistEvent.save();

  log.info("StrategyRemovedFromDepositWhitelist processed successfully", []);
}

// ========================================
// SLASHING RESOLUTION EVENTS (POST-SLASHING SHARE MANAGEMENT)
// ========================================

// TODO: Access use
export function handleBurnOrRedistributableSharesIncreased(
  event: BurnOrRedistributableSharesIncreased
): void {
  log.info(
    "Processing BurnOrRedistributableSharesIncreased: operatorSet {} shares {} strategy {}",
    [
      event.params.operatorSet.id.toString(),
      event.params.shares.toString(),
      event.params.strategy.toHexString(),
    ]
  );

  // Get or create strategy
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );
  strategy.lastActivityAt = event.block.timestamp;
  strategy.save();

  // This event indicates post-slashing share management
  // Important for understanding the full slashing resolution process
  // The amount represents shares that need to be burned or redistributed

  log.info("BurnOrRedistributableSharesIncreased processed successfully", []);
}

// TODO: Access Use
export function handleBurnOrRedistributableSharesDecreased(
  event: BurnOrRedistributableSharesDecreased
): void {
  log.info(
    "Processing BurnOrRedistributableSharesDecreased: operatorSet {} shares {} strategy {}",
    [
      event.params.operatorSet.id.toString(),
      event.params.shares.toString(),
      event.params.strategy.toHexString(),
    ]
  );

  // Get or create strategy
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );
  strategy.lastActivityAt = event.block.timestamp;
  strategy.save();

  // This event indicates resolution of post-slashing share management
  // The decrease suggests shares have been processed (burned or redistributed)

  log.info("BurnOrRedistributableSharesDecreased processed successfully", []);
}

export function handleBurnableSharesDecreased(
  event: BurnableSharesDecreased
): void {
  log.info("Processing BurnableSharesDecreased: strategy {} shares {}", [
    event.params.strategy.toHexString(),
    event.params.shares.toString(),
  ]);

  // Get or create strategy
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );
  strategy.lastActivityAt = event.block.timestamp;
  strategy.save();

  // This event indicates shares have been actually burned
  // Final step in the slashing resolution process

  log.info("BurnableSharesDecreased processed successfully", []);
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getOrCreateStaker(address: Address, timestamp: BigInt): Staker {
  let staker = Staker.load(address.toHexString());
  if (staker == null) {
    staker = new Staker(address.toHexString());
    staker.address = address;
    staker.delegatedOperator = null;
    staker.delegatedAt = null;

    // Initialize counters
    staker.totalStrategies = BigInt.fromI32(0);
    staker.delegationChangeCount = BigInt.fromI32(0);
    staker.withdrawalCount = BigInt.fromI32(0);

    // Set timestamps
    staker.firstActivityAt = timestamp;
    staker.lastActivityAt = timestamp;
  }
  return staker;
}

function getOrCreateStrategy(address: Address, timestamp: BigInt): Strategy {
  let strategy = Strategy.load(address.toHexString());
  if (strategy == null) {
    strategy = new Strategy(address.toHexString());
    strategy.address = address;

    // Initialize counters
    strategy.totalDeposits = BigInt.fromI32(0);
    strategy.totalShares = BigInt.fromI32(0);
    strategy.operatorCount = BigInt.fromI32(0);

    // Initialize status
    strategy.isWhitelisted = true; // Assume whitelisted until proven otherwise
    strategy.whitelistedAt = null;

    // Set timestamps
    strategy.firstDepositAt = null;
    strategy.lastActivityAt = timestamp;
  }
  return strategy;
}
