import {
  OperatorRegistered,
  OperatorMetadataURIUpdated,
  StakerDelegated,
  StakerUndelegated,
  StakerForceUndelegated,
  OperatorSharesIncreased,
  OperatorSharesDecreased,
  OperatorSharesSlashed,
  SlashingWithdrawalQueued,
  SlashingWithdrawalCompleted,
  DelegationApproverUpdated,
  DepositScalingFactorUpdated,
} from "../generated/DelegationManager/DelegationManager";

import {
  Operator,
  Staker,
  Strategy,
  OperatorRegistered as OperatorRegisteredEntity,
  OperatorMetadataUpdate,
  OperatorShareEvent,
  StakerDelegation,
  StakerDelegationEvent,
  WithdrawalEvent,
} from "../generated/schema";

import { BigInt, log, Address } from "@graphprotocol/graph-ts";

// ========================================
// OPERATOR LIFECYCLE EVENTS
// ========================================

export function handleOperatorRegistered(event: OperatorRegistered): void {
  log.info("Processing OperatorRegistered for operator: {}", [
    event.params.operator.toHexString(),
  ]);

  // Create or load operator entity
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    operator = new Operator(event.params.operator.toHexString());
    operator.address = event.params.operator;
    operator.delegationApprover = event.params.delegationApprover;
    operator.metadataURI = null;

    // Initialize counters
    operator.delegatorCount = BigInt.fromI32(0);
    operator.avsRegistrationCount = BigInt.fromI32(0);
    operator.operatorSetCount = BigInt.fromI32(0);
    operator.slashingEventCount = BigInt.fromI32(0);

    // Set registration info
    operator.registeredAt = event.block.timestamp;
    operator.registeredAtBlock = event.block.number;
    operator.registeredAtTransaction = event.transaction.hash;

    // Set activity timestamps
    operator.lastActivityAt = event.block.timestamp;
    operator.updatedAt = event.block.timestamp;
  }

  // Create registration event entity
  let registrationEvent = new OperatorRegisteredEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  registrationEvent.transactionHash = event.transaction.hash;
  registrationEvent.logIndex = event.logIndex;
  registrationEvent.blockNumber = event.block.number;
  registrationEvent.blockTimestamp = event.block.timestamp;
  registrationEvent.contractAddress = event.address;
  registrationEvent.operator = operator.id;
  registrationEvent.delegationApprover = event.params.delegationApprover;

  // Link registration event to operator
  operator.registrationEvent = registrationEvent.id;

  // Save entities
  operator.save();
  registrationEvent.save();

  log.info("OperatorRegistered processed successfully for operator: {}", [
    event.params.operator.toHexString(),
  ]);
}

export function handleOperatorMetadataURIUpdated(
  event: OperatorMetadataURIUpdated
): void {
  log.info("Processing OperatorMetadataURIUpdated for operator: {}", [
    event.params.operator.toHexString(),
  ]);

  // Load operator (should exist from registration)
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    log.warning("Operator not found for metadata update: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  // Update operator metadata
  operator.metadataURI = event.params.metadataURI;
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  // Create metadata update event
  let metadataUpdate = new OperatorMetadataUpdate(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  metadataUpdate.transactionHash = event.transaction.hash;
  metadataUpdate.logIndex = event.logIndex;
  metadataUpdate.blockNumber = event.block.number;
  metadataUpdate.blockTimestamp = event.block.timestamp;
  metadataUpdate.contractAddress = event.address;
  metadataUpdate.operator = operator.id;
  metadataUpdate.metadataURI = event.params.metadataURI;

  // Save entities
  operator.save();
  metadataUpdate.save();

  log.info("OperatorMetadataURIUpdated processed successfully", []);
}

// ========================================
// DELEGATION RELATIONSHIP EVENTS
// ========================================

export function handleStakerDelegated(event: StakerDelegated): void {
  log.info("Processing StakerDelegated: staker {} to operator {}", [
    event.params.staker.toHexString(),
    event.params.operator.toHexString(),
  ]);

  // Create or load staker
  let staker = getOrCreateStaker(event.params.staker, event.block.timestamp);

  // Load operator (should exist)
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    log.warning("Operator not found for delegation: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  // Update staker delegation
  staker.delegatedOperator = operator.id;
  staker.delegatedAt = event.block.timestamp;
  staker.delegationChangeCount = staker.delegationChangeCount.plus(
    BigInt.fromI32(1)
  );
  staker.lastActivityAt = event.block.timestamp;

  // Update operator counters
  operator.delegatorCount = operator.delegatorCount.plus(BigInt.fromI32(1));
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  // Create delegation relationship entity
  let delegationId =
    staker.id + "-" + operator.id + "-" + event.block.timestamp.toString();
  let delegation = new StakerDelegation(delegationId);
  delegation.staker = staker.id;
  delegation.operator = operator.id;
  delegation.delegationType = "DELEGATED";
  delegation.transactionHash = event.transaction.hash;
  delegation.blockNumber = event.block.number;
  delegation.blockTimestamp = event.block.timestamp;
  delegation.logIndex = event.logIndex;

  // Create delegation event
  let delegationEvent = new StakerDelegationEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  delegationEvent.transactionHash = event.transaction.hash;
  delegationEvent.logIndex = event.logIndex;
  delegationEvent.blockNumber = event.block.number;
  delegationEvent.blockTimestamp = event.block.timestamp;
  delegationEvent.contractAddress = event.address;
  delegationEvent.staker = staker.id;
  delegationEvent.operator = operator.id;
  delegationEvent.delegationType = "DELEGATED";

  // Save entities
  staker.save();
  operator.save();
  delegation.save();
  delegationEvent.save();

  log.info("StakerDelegated processed successfully", []);
}

export function handleStakerUndelegated(event: StakerUndelegated): void {
  log.info("Processing StakerUndelegated: staker {} from operator {}", [
    event.params.staker.toHexString(),
    event.params.operator.toHexString(),
  ]);

  // Load staker
  let staker = Staker.load(event.params.staker.toHexString());
  if (staker == null) {
    log.warning("Staker not found for undelegation: {}", [
      event.params.staker.toHexString(),
    ]);
    return;
  }

  // Load operator
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    log.warning("Operator not found for undelegation: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  // Update staker - remove delegation
  staker.delegatedOperator = null;
  staker.delegatedAt = null;
  staker.delegationChangeCount = staker.delegationChangeCount.plus(
    BigInt.fromI32(1)
  );
  staker.lastActivityAt = event.block.timestamp;

  // Update operator counters
  operator.delegatorCount = operator.delegatorCount.minus(BigInt.fromI32(1));
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  // Create delegation relationship entity
  let delegationId =
    staker.id + "-" + operator.id + "-" + event.block.timestamp.toString();
  let delegation = new StakerDelegation(delegationId);
  delegation.staker = staker.id;
  delegation.operator = operator.id;
  delegation.delegationType = "UNDELEGATED";
  delegation.transactionHash = event.transaction.hash;
  delegation.blockNumber = event.block.number;
  delegation.blockTimestamp = event.block.timestamp;
  delegation.logIndex = event.logIndex;

  // Create delegation event
  let delegationEvent = new StakerDelegationEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  delegationEvent.transactionHash = event.transaction.hash;
  delegationEvent.logIndex = event.logIndex;
  delegationEvent.blockNumber = event.block.number;
  delegationEvent.blockTimestamp = event.block.timestamp;
  delegationEvent.contractAddress = event.address;
  delegationEvent.staker = staker.id;
  delegationEvent.operator = operator.id;
  delegationEvent.delegationType = "UNDELEGATED";

  // Save entities
  staker.save();
  operator.save();
  delegation.save();
  delegationEvent.save();

  log.info("StakerUndelegated processed successfully", []);
}

export function handleStakerForceUndelegated(
  event: StakerForceUndelegated
): void {
  log.info("Processing StakerForceUndelegated: staker {} from operator {}", [
    event.params.staker.toHexString(),
    event.params.operator.toHexString(),
  ]);

  // Load staker
  let staker = Staker.load(event.params.staker.toHexString());
  if (staker == null) {
    log.warning("Staker not found for force undelegation: {}", [
      event.params.staker.toHexString(),
    ]);
    return;
  }

  // Load operator
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    log.warning("Operator not found for force undelegation: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  // Update staker - remove delegation
  staker.delegatedOperator = null;
  staker.delegatedAt = null;
  staker.delegationChangeCount = staker.delegationChangeCount.plus(
    BigInt.fromI32(1)
  );
  staker.lastActivityAt = event.block.timestamp;

  // Update operator counters
  operator.delegatorCount = operator.delegatorCount.minus(BigInt.fromI32(1));
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  // Create delegation relationship entity
  let delegationId =
    staker.id + "-" + operator.id + "-" + event.block.timestamp.toString();
  let delegation = new StakerDelegation(delegationId);
  delegation.staker = staker.id;
  delegation.operator = operator.id;
  delegation.delegationType = "FORCE_UNDELEGATED";
  delegation.transactionHash = event.transaction.hash;
  delegation.blockNumber = event.block.number;
  delegation.blockTimestamp = event.block.timestamp;
  delegation.logIndex = event.logIndex;

  // Create delegation event
  let delegationEvent = new StakerDelegationEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  delegationEvent.transactionHash = event.transaction.hash;
  delegationEvent.logIndex = event.logIndex;
  delegationEvent.blockNumber = event.block.number;
  delegationEvent.blockTimestamp = event.block.timestamp;
  delegationEvent.contractAddress = event.address;
  delegationEvent.staker = staker.id;
  delegationEvent.operator = operator.id;
  delegationEvent.delegationType = "FORCE_UNDELEGATED";

  // Save entities
  staker.save();
  operator.save();
  delegation.save();
  delegationEvent.save();

  log.info("StakerForceUndelegated processed successfully", []);
}

// ========================================
// SHARE TRACKING EVENTS (CRITICAL FOR RISK)
// ========================================

export function handleOperatorSharesIncreased(
  event: OperatorSharesIncreased
): void {
  log.info(
    "Processing OperatorSharesIncreased: operator {} staker {} strategy {} shares {}",
    [
      event.params.operator.toHexString(),
      event.params.staker.toHexString(),
      event.params.strategy.toHexString(),
      event.params.shares.toString(),
    ]
  );

  // Load entities
  let operator = Operator.load(event.params.operator.toHexString());
  let staker = getOrCreateStaker(event.params.staker, event.block.timestamp);
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  if (operator == null) {
    log.warning("Operator not found for shares increase: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  // Update strategy counters
  strategy.totalShares = strategy.totalShares.plus(event.params.shares);
  strategy.lastActivityAt = event.block.timestamp;

  // Update operator activity
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  // Update staker activity
  staker.lastActivityAt = event.block.timestamp;

  // Create share event
  let shareEvent = new OperatorShareEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  shareEvent.transactionHash = event.transaction.hash;
  shareEvent.logIndex = event.logIndex;
  shareEvent.blockNumber = event.block.number;
  shareEvent.blockTimestamp = event.block.timestamp;
  shareEvent.contractAddress = event.address;
  shareEvent.operator = operator.id;
  shareEvent.staker = staker.id;
  shareEvent.strategy = strategy.id;
  shareEvent.shares = event.params.shares;
  shareEvent.eventType = "INCREASED";

  // Save entities
  operator.save();
  staker.save();
  strategy.save();
  shareEvent.save();

  log.info("OperatorSharesIncreased processed successfully", []);
}

export function handleOperatorSharesDecreased(
  event: OperatorSharesDecreased
): void {
  log.info(
    "Processing OperatorSharesDecreased: operator {} staker {} strategy {} shares {}",
    [
      event.params.operator.toHexString(),
      event.params.staker.toHexString(),
      event.params.strategy.toHexString(),
      event.params.shares.toString(),
    ]
  );

  // Load entities
  let operator = Operator.load(event.params.operator.toHexString());
  let staker = getOrCreateStaker(event.params.staker, event.block.timestamp);
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  if (operator == null) {
    log.warning("Operator not found for shares decrease: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  // Update strategy counters
  strategy.totalShares = strategy.totalShares.minus(event.params.shares);
  strategy.lastActivityAt = event.block.timestamp;

  // Update operator activity
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  // Update staker activity
  staker.lastActivityAt = event.block.timestamp;

  // Create share event
  let shareEvent = new OperatorShareEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  shareEvent.transactionHash = event.transaction.hash;
  shareEvent.logIndex = event.logIndex;
  shareEvent.blockNumber = event.block.number;
  shareEvent.blockTimestamp = event.block.timestamp;
  shareEvent.contractAddress = event.address;
  shareEvent.operator = operator.id;
  shareEvent.staker = staker.id;
  shareEvent.strategy = strategy.id;
  shareEvent.shares = event.params.shares;
  shareEvent.eventType = "DECREASED";

  // Save entities
  operator.save();
  staker.save();
  strategy.save();
  shareEvent.save();

  log.info("OperatorSharesDecreased processed successfully", []);
}

export function handleOperatorSharesSlashed(
  event: OperatorSharesSlashed
): void {
  log.info(
    "CRITICAL: OperatorSharesSlashed - operator {} strategy {} totalSlashedShares {}",
    [
      event.params.operator.toHexString(),
      event.params.strategy.toHexString(),
      event.params.totalSlashedShares.toString(),
    ]
  );

  // Load entities
  let operator = Operator.load(event.params.operator.toHexString());
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  if (operator == null) {
    log.warning("Operator not found for slashing: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  // Update operator slashing counter - CRITICAL FOR RISK ASSESSMENT
  operator.slashingEventCount = operator.slashingEventCount.plus(
    BigInt.fromI32(1)
  );
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  // Update strategy
  strategy.totalShares = strategy.totalShares.minus(
    event.params.totalSlashedShares
  );
  strategy.lastActivityAt = event.block.timestamp;

  // Create share event for slashing
  let shareEvent = new OperatorShareEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  shareEvent.transactionHash = event.transaction.hash;
  shareEvent.logIndex = event.logIndex;
  shareEvent.blockNumber = event.block.number;
  shareEvent.blockTimestamp = event.block.timestamp;
  shareEvent.contractAddress = event.address;
  shareEvent.operator = operator.id;
  shareEvent.staker = "SLASHED"; // Special marker for slashing events
  shareEvent.strategy = strategy.id;
  shareEvent.shares = event.params.totalSlashedShares;
  shareEvent.eventType = "DECREASED"; // Slashing is a special type of decrease

  // Save entities
  operator.save();
  strategy.save();
  shareEvent.save();

  log.info(
    "CRITICAL: OperatorSharesSlashed processed - operator {} totalSlashedShares {} shares",
    [
      event.params.operator.toHexString(),
      event.params.totalSlashedShares.toString(),
    ]
  );
}

// ========================================
// WITHDRAWAL TRACKING EVENTS
// ========================================

export function handleSlashingWithdrawalQueued(
  event: SlashingWithdrawalQueued
): void {
  log.info("Processing SlashingWithdrawalQueued: root {}", [
    event.params.withdrawalRoot.toHexString(),
  ]);

  // Extract withdrawal struct data
  let withdrawal = event.params.withdrawal;
  let sharesToWithdraw = event.params.sharesToWithdraw;

  // Load staker
  let staker = getOrCreateStaker(withdrawal.staker, event.block.timestamp);
  staker.withdrawalCount = staker.withdrawalCount.plus(BigInt.fromI32(1));
  staker.lastActivityAt = event.block.timestamp;

  // Load operator if delegated
  let operator: Operator | null = null;
  if (withdrawal.delegatedTo.notEqual(Address.zero())) {
    operator = Operator.load(withdrawal.delegatedTo.toHexString());
    if (operator != null) {
      operator.lastActivityAt = event.block.timestamp;
      operator.updatedAt = event.block.timestamp;
    }
  }

  // Create withdrawal event
  let withdrawalEvent = new WithdrawalEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  withdrawalEvent.transactionHash = event.transaction.hash;
  withdrawalEvent.logIndex = event.logIndex;
  withdrawalEvent.blockNumber = event.block.number;
  withdrawalEvent.blockTimestamp = event.block.timestamp;
  withdrawalEvent.contractAddress = event.address;
  withdrawalEvent.withdrawalRoot = event.params.withdrawalRoot;
  withdrawalEvent.staker = staker.id;
  withdrawalEvent.delegatedTo = operator != null ? operator.id : null;
  withdrawalEvent.withdrawer = withdrawal.withdrawer;
  withdrawalEvent.nonce = withdrawal.nonce;
  withdrawalEvent.startBlock = withdrawal.startBlock;
  withdrawalEvent.strategies = withdrawal.strategies.map<string>(
    (strategy: Address) => strategy.toHexString()
  );
  withdrawalEvent.shares = sharesToWithdraw;
  withdrawalEvent.eventType = "QUEUED";

  // Save entities
  staker.save();
  if (operator != null) {
    operator.save();
  }
  withdrawalEvent.save();

  log.info("SlashingWithdrawalQueued processed successfully", []);
}

export function handleSlashingWithdrawalCompleted(
  event: SlashingWithdrawalCompleted
): void {
  log.info("Processing SlashingWithdrawalCompleted: root {}", [
    event.params.withdrawalRoot.toHexString(),
  ]);

  // Create completion event
  let withdrawalEvent = new WithdrawalEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  withdrawalEvent.transactionHash = event.transaction.hash;
  withdrawalEvent.logIndex = event.logIndex;
  withdrawalEvent.blockNumber = event.block.number;
  withdrawalEvent.blockTimestamp = event.block.timestamp;
  withdrawalEvent.contractAddress = event.address;
  withdrawalEvent.withdrawalRoot = event.params.withdrawalRoot;
  withdrawalEvent.staker = "UNKNOWN"; // Root only, no direct staker reference
  withdrawalEvent.delegatedTo = null;
  withdrawalEvent.withdrawer = Address.zero();
  withdrawalEvent.nonce = BigInt.fromI32(0);
  withdrawalEvent.startBlock = BigInt.fromI32(0);
  withdrawalEvent.strategies = [];
  withdrawalEvent.shares = [];
  withdrawalEvent.eventType = "COMPLETED";

  withdrawalEvent.save();

  log.info("SlashingWithdrawalCompleted processed successfully", []);
}

// ========================================
// ADMINISTRATIVE EVENTS
// ========================================

export function handleDelegationApproverUpdated(
  event: DelegationApproverUpdated
): void {
  log.info("Processing DelegationApproverUpdated: operator {} approver {}", [
    event.params.operator.toHexString(),
    event.params.newDelegationApprover.toHexString(),
  ]);

  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    log.warning("Operator not found for delegation approver update: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  operator.delegationApprover = event.params.newDelegationApprover;
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  operator.save();

  log.info("DelegationApproverUpdated processed successfully", []);
}

// TODO: Review this function
export function handleDepositScalingFactorUpdated(
  event: DepositScalingFactorUpdated
): void {
  log.info(
    "Processing DepositScalingFactorUpdated: strategy {} staker {} factor {}",
    [
      event.params.strategy.toHexString(),
      event.params.staker.toHexString(),
      event.params.newDepositScalingFactor.toString(),
    ]
  );

  // This is primarily a technical event for share calculations
  // We'll track it but it doesn't significantly impact risk scoring

  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );
  strategy.lastActivityAt = event.block.timestamp;

  let staker = getOrCreateStaker(event.params.staker, event.block.timestamp);
  staker.lastActivityAt = event.block.timestamp;

  strategy.save();
  staker.save();

  log.info("DepositScalingFactorUpdated processed successfully", []);
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
