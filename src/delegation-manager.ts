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
  // Minimal lookup entities
  Operator,
  Staker,
  Strategy,
  // Event entities only
  OperatorRegistered as OperatorRegisteredEntity,
  DelegationApproverUpdated as DelegationApproverUpdatedEntity,
  OperatorMetadataUpdate,
  OperatorShareEvent,
  StakerDelegationEvent,
  StakerForceUndelegated as StakerForceUndelegatedEntity,
  DepositScalingFactorUpdated as DepositScalingFactorUpdatedEntity,
  WithdrawalEvent,
  OperatorSharesSlashed as OperatorSharesSlashedEntity,
  OperatorStrategyShare,
} from "../generated/schema";

import { log, Address, BigInt } from "@graphprotocol/graph-ts";

// ========================================
// OPERATOR LIFECYCLE EVENTS
// ========================================

export function handleOperatorRegistered(event: OperatorRegistered): void {
  log.info("Processing OperatorRegistered event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // DATA QUALITY GUARD: Operator address must not be zero
  if (event.params.operator.equals(Address.zero())) {
    log.critical(
      "INVARIANT VIOLATION: OperatorRegistered with zero address at tx {}",
      [event.transaction.hash.toHexString()],
    );
  }

  // Create minimal lookup entity if needed
  let operator = getOrCreateOperator(event.params.operator);

  // Create pure event entity with complete data
  let registrationEvent = new OperatorRegisteredEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields (inherited from BaseEvent interface)
  registrationEvent.transactionHash = event.transaction.hash;
  registrationEvent.logIndex = event.logIndex;
  registrationEvent.blockNumber = event.block.number;
  registrationEvent.blockTimestamp = event.block.timestamp;
  registrationEvent.contractAddress = event.address;

  // Event-specific fields
  registrationEvent.operator = operator.id;
  registrationEvent.delegationApprover = event.params.delegationApprover;

  // Save entities
  operator.save();
  registrationEvent.save();

  log.info("OperatorRegistered event saved: {}", [registrationEvent.id]);
}

export function handleDelegationApproverUpdated(
  event: DelegationApproverUpdated,
): void {
  log.info("Processing DelegationApproverUpdated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let operator = getOrCreateOperator(event.params.operator);

  // Create pure event entity
  let approverEvent = new DelegationApproverUpdatedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  approverEvent.transactionHash = event.transaction.hash;
  approverEvent.logIndex = event.logIndex;
  approverEvent.blockNumber = event.block.number;
  approverEvent.blockTimestamp = event.block.timestamp;
  approverEvent.contractAddress = event.address;

  // Event-specific fields
  approverEvent.operator = operator.id;
  approverEvent.newDelegationApprover = event.params.newDelegationApprover;

  // Save entities
  operator.save();
  approverEvent.save();

  log.info("DelegationApproverUpdated event saved: {}", [approverEvent.id]);
}

export function handleOperatorMetadataURIUpdated(
  event: OperatorMetadataURIUpdated,
): void {
  log.info("Processing OperatorMetadataURIUpdated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let operator = getOrCreateOperator(event.params.operator);

  // Create pure event entity
  let metadataUpdate = new OperatorMetadataUpdate(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  metadataUpdate.transactionHash = event.transaction.hash;
  metadataUpdate.logIndex = event.logIndex;
  metadataUpdate.blockNumber = event.block.number;
  metadataUpdate.blockTimestamp = event.block.timestamp;
  metadataUpdate.contractAddress = event.address;

  // Event-specific fields
  metadataUpdate.operator = operator.id;
  metadataUpdate.metadataURI = event.params.metadataURI;

  // Save entities
  operator.save();
  metadataUpdate.save();

  log.info("OperatorMetadataURIUpdated event saved: {}", [metadataUpdate.id]);
}

// ========================================
// DELEGATION RELATIONSHIP EVENTS
// ========================================

export function handleStakerDelegated(event: StakerDelegated): void {
  log.info("Processing StakerDelegated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // DATA QUALITY GUARDS: Staker and operator must not be zero addresses
  if (event.params.staker.equals(Address.zero())) {
    log.critical(
      "INVARIANT VIOLATION: StakerDelegated with zero staker at tx {}",
      [event.transaction.hash.toHexString()],
    );
  }
  if (event.params.operator.equals(Address.zero())) {
    log.critical(
      "INVARIANT VIOLATION: StakerDelegated with zero operator at tx {}",
      [event.transaction.hash.toHexString()],
    );
  }

  // Create minimal lookup entities if needed
  let staker = getOrCreateStaker(event.params.staker);
  let operator = getOrCreateOperator(event.params.operator);

  // Create pure event entity
  let delegationEvent = new StakerDelegationEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  delegationEvent.transactionHash = event.transaction.hash;
  delegationEvent.logIndex = event.logIndex;
  delegationEvent.blockNumber = event.block.number;
  delegationEvent.blockTimestamp = event.block.timestamp;
  delegationEvent.contractAddress = event.address;

  // Event-specific fields
  delegationEvent.staker = staker.id;
  delegationEvent.operator = operator.id;
  delegationEvent.delegationType = "DELEGATED";

  // Save entities
  staker.save();
  operator.save();
  delegationEvent.save();

  log.info("StakerDelegated event saved: {}", [delegationEvent.id]);
}

export function handleStakerUndelegated(event: StakerUndelegated): void {
  log.info("Processing StakerUndelegated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let staker = getOrCreateStaker(event.params.staker);
  let operator = getOrCreateOperator(event.params.operator);

  // Create pure event entity
  let delegationEvent = new StakerDelegationEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  delegationEvent.transactionHash = event.transaction.hash;
  delegationEvent.logIndex = event.logIndex;
  delegationEvent.blockNumber = event.block.number;
  delegationEvent.blockTimestamp = event.block.timestamp;
  delegationEvent.contractAddress = event.address;

  // Event-specific fields
  delegationEvent.staker = staker.id;
  delegationEvent.operator = operator.id;
  delegationEvent.delegationType = "UNDELEGATED";

  // Save entities
  staker.save();
  operator.save();
  delegationEvent.save();

  log.info("StakerUndelegated event saved: {}", [delegationEvent.id]);
}

export function handleStakerForceUndelegated(
  event: StakerForceUndelegated,
): void {
  log.info("Processing StakerForceUndelegated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let staker = getOrCreateStaker(event.params.staker);
  let operator = getOrCreateOperator(event.params.operator);

  // Create pure event entity (specific type for force undelegation)
  let forceUndelegationEvent = new StakerForceUndelegatedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  forceUndelegationEvent.transactionHash = event.transaction.hash;
  forceUndelegationEvent.logIndex = event.logIndex;
  forceUndelegationEvent.blockNumber = event.block.number;
  forceUndelegationEvent.blockTimestamp = event.block.timestamp;
  forceUndelegationEvent.contractAddress = event.address;

  // Event-specific fields
  forceUndelegationEvent.staker = staker.id;
  forceUndelegationEvent.operator = operator.id;

  // Also create delegation event for consistency
  let delegationEvent = new StakerDelegationEvent(
    event.transaction.hash.toHexString() +
      "-" +
      event.logIndex.toString() +
      "-delegation",
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
  forceUndelegationEvent.save();
  delegationEvent.save();

  log.info("StakerForceUndelegated event saved: {}", [
    forceUndelegationEvent.id,
  ]);
}

// ========================================
// SHARE TRACKING EVENTS
// ========================================

export function handleOperatorSharesIncreased(
  event: OperatorSharesIncreased,
): void {
  log.info("Processing OperatorSharesIncreased event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let staker = getOrCreateStaker(event.params.staker);
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let shareEvent = new OperatorShareEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  shareEvent.transactionHash = event.transaction.hash;
  shareEvent.logIndex = event.logIndex;
  shareEvent.blockNumber = event.block.number;
  shareEvent.blockTimestamp = event.block.timestamp;
  shareEvent.contractAddress = event.address;

  // Event-specific fields
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

  // Update running totals
  let operatorStrategyShareId = operator.id + "-" + strategy.id;
  let operatorStrategyShare = OperatorStrategyShare.load(
    operatorStrategyShareId,
  );
  if (operatorStrategyShare == null) {
    operatorStrategyShare = new OperatorStrategyShare(operatorStrategyShareId);
    operatorStrategyShare.operator = operator.id;
    operatorStrategyShare.strategy = strategy.id;
    operatorStrategyShare.totalShares = BigInt.fromI32(0);
  }
  operatorStrategyShare.totalShares = operatorStrategyShare.totalShares.plus(
    event.params.shares,
  );
  operatorStrategyShare.lastUpdatedBlock = event.block.number;
  operatorStrategyShare.lastUpdatedTimestamp = event.block.timestamp;
  operatorStrategyShare.lastUpdatedTxHash = event.transaction.hash;
  operatorStrategyShare.save();

  log.info("OperatorSharesIncreased event saved: {}", [shareEvent.id]);
}

export function handleOperatorSharesDecreased(
  event: OperatorSharesDecreased,
): void {
  log.info("Processing OperatorSharesDecreased event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let staker = getOrCreateStaker(event.params.staker);
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let shareEvent = new OperatorShareEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  shareEvent.transactionHash = event.transaction.hash;
  shareEvent.logIndex = event.logIndex;
  shareEvent.blockNumber = event.block.number;
  shareEvent.blockTimestamp = event.block.timestamp;
  shareEvent.contractAddress = event.address;

  // Event-specific fields
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

  // Update running totals
  let operatorStrategyShareId = operator.id + "-" + strategy.id;
  let operatorStrategyShare = OperatorStrategyShare.load(
    operatorStrategyShareId,
  );
  if (operatorStrategyShare == null) {
    operatorStrategyShare = new OperatorStrategyShare(operatorStrategyShareId);
    operatorStrategyShare.operator = operator.id;
    operatorStrategyShare.strategy = strategy.id;
    operatorStrategyShare.totalShares = BigInt.fromI32(0);
  }
  operatorStrategyShare.totalShares = operatorStrategyShare.totalShares.minus(
    event.params.shares,
  );
  operatorStrategyShare.lastUpdatedBlock = event.block.number;
  operatorStrategyShare.lastUpdatedTimestamp = event.block.timestamp;
  operatorStrategyShare.lastUpdatedTxHash = event.transaction.hash;
  operatorStrategyShare.save();

  log.info("OperatorSharesDecreased event saved: {}", [shareEvent.id]);
}

export function handleOperatorSharesSlashed(
  event: OperatorSharesSlashed,
): void {
  log.info("Processing OperatorSharesSlashed event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity (specific type for slashing)
  let slashingEvent = new OperatorSharesSlashedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  slashingEvent.transactionHash = event.transaction.hash;
  slashingEvent.logIndex = event.logIndex;
  slashingEvent.blockNumber = event.block.number;
  slashingEvent.blockTimestamp = event.block.timestamp;
  slashingEvent.contractAddress = event.address;

  // Event-specific fields
  slashingEvent.operator = operator.id;
  slashingEvent.strategy = strategy.id;
  slashingEvent.totalSlashedShares = event.params.totalSlashedShares;

  // Save entities
  operator.save();
  strategy.save();
  slashingEvent.save();

  // Update running totals
  let operatorStrategyShareId = operator.id + "-" + strategy.id;
  let operatorStrategyShare = OperatorStrategyShare.load(
    operatorStrategyShareId,
  );
  if (operatorStrategyShare == null) {
    // Should exist if slashed, but handle gracefully
    operatorStrategyShare = new OperatorStrategyShare(operatorStrategyShareId);
    operatorStrategyShare.operator = operator.id;
    operatorStrategyShare.strategy = strategy.id;
    operatorStrategyShare.totalShares = BigInt.fromI32(0);
  }
  operatorStrategyShare.totalShares = operatorStrategyShare.totalShares.minus(
    event.params.totalSlashedShares,
  );
  operatorStrategyShare.lastUpdatedBlock = event.block.number;
  operatorStrategyShare.lastUpdatedTimestamp = event.block.timestamp;
  operatorStrategyShare.lastUpdatedTxHash = event.transaction.hash;
  operatorStrategyShare.save();

  // Create unified OperatorShareEvent for history
  let shareEvent = new OperatorShareEvent(
    event.transaction.hash.toHexString() +
      "-" +
      event.logIndex.toString() +
      "-slashed",
  );
  shareEvent.transactionHash = event.transaction.hash;
  shareEvent.logIndex = event.logIndex;
  shareEvent.blockNumber = event.block.number;
  shareEvent.blockTimestamp = event.block.timestamp;
  shareEvent.contractAddress = event.address;
  shareEvent.operator = operator.id;
  shareEvent.staker = "SLASHED"; // No specific staker for total slashed
  shareEvent.strategy = strategy.id;
  shareEvent.shares = event.params.totalSlashedShares; // Positive value, eventType implies direction
  shareEvent.eventType = "SLASHED";
  shareEvent.save();

  log.info("OperatorSharesSlashed event saved: {}", [slashingEvent.id]);
}

// ========================================
// WITHDRAWAL TRACKING EVENTS
// ========================================

export function handleSlashingWithdrawalQueued(
  event: SlashingWithdrawalQueued,
): void {
  log.info("Processing SlashingWithdrawalQueued event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Extract withdrawal struct data
  let withdrawal = event.params.withdrawal;
  let sharesToWithdraw = event.params.sharesToWithdraw;

  // DATA QUALITY GUARD: Strategies and shares arrays must match in length
  if (withdrawal.strategies.length != sharesToWithdraw.length) {
    log.critical(
      "INVARIANT VIOLATION: Strategy/shares array mismatch ({} vs {}) at tx {}",
      [
        withdrawal.strategies.length.toString(),
        sharesToWithdraw.length.toString(),
        event.transaction.hash.toHexString(),
      ],
    );
  }

  // Create minimal lookup entities if needed
  let staker = getOrCreateStaker(withdrawal.staker);
  let operator: Operator | null = null;
  if (withdrawal.delegatedTo.notEqual(Address.zero())) {
    operator = getOrCreateOperator(withdrawal.delegatedTo);
  }

  // Create pure event entity
  let withdrawalEvent = new WithdrawalEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  withdrawalEvent.transactionHash = event.transaction.hash;
  withdrawalEvent.logIndex = event.logIndex;
  withdrawalEvent.blockNumber = event.block.number;
  withdrawalEvent.blockTimestamp = event.block.timestamp;
  withdrawalEvent.contractAddress = event.address;

  // Event-specific fields
  withdrawalEvent.withdrawalRoot = event.params.withdrawalRoot;
  withdrawalEvent.staker = staker.id;
  withdrawalEvent.delegatedTo = operator != null ? operator.id : null;
  withdrawalEvent.withdrawer = withdrawal.withdrawer;
  withdrawalEvent.nonce = withdrawal.nonce;
  withdrawalEvent.startBlock = withdrawal.startBlock;
  withdrawalEvent.strategies = withdrawal.strategies.map<string>(
    (strategy: Address) => strategy.toHexString(),
  );
  withdrawalEvent.shares = sharesToWithdraw;
  withdrawalEvent.eventType = "QUEUED";
  withdrawalEvent.isComplete = true;

  // Save entities
  staker.save();
  if (operator != null) {
    operator.save();
  }
  withdrawalEvent.save();

  log.info("SlashingWithdrawalQueued event saved: {}", [withdrawalEvent.id]);
}

export function handleSlashingWithdrawalCompleted(
  event: SlashingWithdrawalCompleted,
): void {
  log.info("Processing SlashingWithdrawalCompleted event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity (minimal data since only root is provided)
  let withdrawalEvent = new WithdrawalEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  withdrawalEvent.transactionHash = event.transaction.hash;
  withdrawalEvent.logIndex = event.logIndex;
  withdrawalEvent.blockNumber = event.block.number;
  withdrawalEvent.blockTimestamp = event.block.timestamp;
  withdrawalEvent.contractAddress = event.address;

  // Event-specific fields (minimal for completion event)
  withdrawalEvent.withdrawalRoot = event.params.withdrawalRoot;
  withdrawalEvent.staker = "UNKNOWN"; // Root only, no direct staker reference
  withdrawalEvent.delegatedTo = null;
  withdrawalEvent.withdrawer = Address.zero();
  withdrawalEvent.nonce = BigInt.fromI32(0);
  withdrawalEvent.startBlock = BigInt.fromI32(0);
  withdrawalEvent.strategies = [];
  withdrawalEvent.shares = [];
  withdrawalEvent.eventType = "COMPLETED";
  withdrawalEvent.isComplete = false;

  log.warning(
    "SlashingWithdrawalCompleted event {} has incomplete data - only withdrawalRoot available",
    [withdrawalEvent.id],
  );

  withdrawalEvent.save();

  log.info("SlashingWithdrawalCompleted event saved: {}", [withdrawalEvent.id]);
}

// ========================================
// ADDITIONAL EVENTS
// ========================================

export function handleDepositScalingFactorUpdated(
  event: DepositScalingFactorUpdated,
): void {
  log.info("Processing DepositScalingFactorUpdated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let staker = getOrCreateStaker(event.params.staker);
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let scalingEvent = new DepositScalingFactorUpdatedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  scalingEvent.transactionHash = event.transaction.hash;
  scalingEvent.logIndex = event.logIndex;
  scalingEvent.blockNumber = event.block.number;
  scalingEvent.blockTimestamp = event.block.timestamp;
  scalingEvent.contractAddress = event.address;

  // Event-specific fields
  scalingEvent.staker = staker.id;
  scalingEvent.strategy = strategy.id;
  scalingEvent.newDepositScalingFactor = event.params.newDepositScalingFactor;

  // Save entities
  staker.save();
  strategy.save();
  scalingEvent.save();

  log.info("DepositScalingFactorUpdated event saved: {}", [scalingEvent.id]);
}

// ========================================
// MINIMAL HELPER FUNCTIONS
// ========================================

function getOrCreateOperator(address: Address): Operator {
  let operator = Operator.load(address.toHexString());
  if (operator == null) {
    operator = new Operator(address.toHexString());
    operator.address = address;
  }
  return operator;
}

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
