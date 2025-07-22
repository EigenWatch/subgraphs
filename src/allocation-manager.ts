import {
  OperatorSlashed,
  AllocationUpdated,
  AllocationDelaySet,
  EncumberedMagnitudeUpdated,
  MaxMagnitudeUpdated,
  OperatorSetCreated,
  OperatorAddedToOperatorSet,
  OperatorRemovedFromOperatorSet,
  StrategyAddedToOperatorSet,
  StrategyRemovedFromOperatorSet,
  AVSMetadataURIUpdated,
  RedistributionAddressSet,
  AVSRegistrarSet,
} from "../generated/AllocationManager/AllocationManager";

import {
  Operator,
  AVS,
  OperatorSet,
  Strategy,
  OperatorSlashed as OperatorSlashedEntity,
  AllocationEvent,
  OperatorSetCreated as OperatorSetCreatedEntity,
  OperatorSetMembership,
  OperatorAddedToOperatorSet as OperatorAddedEntity,
  OperatorRemovedFromOperatorSet as OperatorRemovedEntity,
  AVSMetadataUpdate,
  StrategyOperatorSetEvent,
} from "../generated/schema";

import { BigInt, log, Address } from "@graphprotocol/graph-ts";

// ========================================
// CRITICAL SLASHING EVENTS (HIGHEST PRIORITY)
// ========================================

export function handleOperatorSlashed(event: OperatorSlashed): void {
  log.info("SLASHING EVENT: Operator {} slashed in set {}", [
    event.params.operator.toHexString(),
    event.params.operatorSet.id.toString(),
  ]);

  // Load operator (should exist)
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    log.error("Critical: Operator not found for slashing event: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  // Load operator set
  let operatorSetId =
    event.params.operatorSet.avs.toHexString() +
    "-" +
    event.params.operatorSet.id.toString();
  let operatorSet = OperatorSet.load(operatorSetId);
  if (operatorSet == null) {
    log.error("Critical: OperatorSet not found for slashing: {}", [
      operatorSetId,
    ]);
    return;
  }

  // Load AVS
  let avs = AVS.load(event.params.operatorSet.avs.toHexString());
  if (avs == null) {
    log.error("Critical: AVS not found for slashing: {}", [
      event.params.operatorSet.avs.toHexString(),
    ]);
    return;
  }

  // Update operator slashing counter - CRITICAL FOR RISK ASSESSMENT
  operator.slashingEventCount = operator.slashingEventCount.plus(
    BigInt.fromI32(1)
  );
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  // Update operator set slashing counter
  operatorSet.slashingEventCount = operatorSet.slashingEventCount.plus(
    BigInt.fromI32(1)
  );
  operatorSet.lastActivityAt = event.block.timestamp;

  // Update AVS slashing counter
  avs.slashingEventCount = avs.slashingEventCount.plus(BigInt.fromI32(1));
  avs.lastActivityAt = event.block.timestamp;
  avs.updatedAt = event.block.timestamp;

  // Create slashing event entity
  let slashingEvent = new OperatorSlashedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  slashingEvent.transactionHash = event.transaction.hash;
  slashingEvent.logIndex = event.logIndex;
  slashingEvent.blockNumber = event.block.number;
  slashingEvent.blockTimestamp = event.block.timestamp;
  slashingEvent.contractAddress = event.address;
  slashingEvent.operator = operator.id;
  slashingEvent.operatorSet = operatorSet.id;
  slashingEvent.strategies = event.params.strategies.map<string>(
    (strategy: Address) => strategy.toHexString()
  );
  slashingEvent.wadSlashed = event.params.wadSlashed;
  slashingEvent.description = event.params.description;

  // Save all entities
  operator.save();
  operatorSet.save();
  avs.save();
  slashingEvent.save();

  log.info("SLASHING PROCESSED: Operator {} lost {} in strategies {}", [
    operator.id,
    event.params.wadSlashed.toString(),
    event.params.strategies.toString(),
  ]);
}

// ========================================
// ALLOCATION BEHAVIOR TRACKING (IMPORTANT FOR RISK)
// ========================================

export function handleAllocationUpdated(event: AllocationUpdated): void {
  log.info("Processing AllocationUpdated: operator {} set {} magnitude {}", [
    event.params.operator.toHexString(),
    event.params.operatorSet.id.toString(),
    event.params.magnitude.toString(),
  ]);

  // Load operator
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    log.warning("Operator not found for allocation update: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  // Load operator set
  let operatorSetId =
    event.params.operatorSet.avs.toHexString() +
    "-" +
    event.params.operatorSet.id.toString();
  let operatorSet = OperatorSet.load(operatorSetId);
  if (operatorSet == null) {
    log.warning("OperatorSet not found for allocation: {}", [operatorSetId]);
    return;
  }

  // Load strategy
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  // Update counters
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;
  operatorSet.allocationCount = operatorSet.allocationCount.plus(
    BigInt.fromI32(1)
  );
  operatorSet.lastActivityAt = event.block.timestamp;
  strategy.lastActivityAt = event.block.timestamp;

  // Create allocation event
  let allocationEvent = new AllocationEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  allocationEvent.transactionHash = event.transaction.hash;
  allocationEvent.logIndex = event.logIndex;
  allocationEvent.blockNumber = event.block.number;
  allocationEvent.blockTimestamp = event.block.timestamp;
  allocationEvent.contractAddress = event.address;
  allocationEvent.operator = operator.id;
  allocationEvent.operatorSet = operatorSet.id;
  allocationEvent.strategy = strategy.id;
  allocationEvent.magnitude = event.params.magnitude;
  allocationEvent.effectBlock = event.params.effectBlock;

  // Save entities
  operator.save();
  operatorSet.save();
  strategy.save();
  allocationEvent.save();

  log.info("AllocationUpdated processed successfully", []);
}

// TODO: Look into this, how useful is it?
export function handleAllocationDelaySet(event: AllocationDelaySet): void {
  log.info("Processing AllocationDelaySet: operator {} delay {}", [
    event.params.operator.toHexString(),
    event.params.delay.toString(),
  ]);

  let operator = Operator.load(event.params.operator.toHexString());
  if (operator != null) {
    operator.lastActivityAt = event.block.timestamp;
    operator.updatedAt = event.block.timestamp;
    operator.save();
  }
}

// TODO: Look into this, how useful is it?
export function handleEncumberedMagnitudeUpdated(
  event: EncumberedMagnitudeUpdated
): void {
  log.info("Processing EncumberedMagnitudeUpdated: operator {} strategy {}", [
    event.params.operator.toHexString(),
    event.params.strategy.toHexString(),
  ]);

  let operator = Operator.load(event.params.operator.toHexString());
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  if (operator != null) {
    operator.lastActivityAt = event.block.timestamp;
    operator.updatedAt = event.block.timestamp;
    operator.save();
  }

  strategy.lastActivityAt = event.block.timestamp;
  strategy.save();
}

// TODO: Look into this, how useful is it?
export function handleMaxMagnitudeUpdated(event: MaxMagnitudeUpdated): void {
  log.info("Processing MaxMagnitudeUpdated: operator {} strategy {}", [
    event.params.operator.toHexString(),
    event.params.strategy.toHexString(),
  ]);

  let operator = Operator.load(event.params.operator.toHexString());
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  if (operator != null) {
    operator.lastActivityAt = event.block.timestamp;
    operator.updatedAt = event.block.timestamp;
    operator.save();
  }

  strategy.lastActivityAt = event.block.timestamp;
  strategy.save();
}

// ========================================
// OPERATOR SET LIFECYCLE (CRITICAL FOR AVS TRACKING)
// ========================================

export function handleOperatorSetCreated(event: OperatorSetCreated): void {
  log.info("Processing OperatorSetCreated: AVS {} set ID {}", [
    event.params.operatorSet.avs.toHexString(),
    event.params.operatorSet.id.toString(),
  ]);

  // Get or create AVS
  let avs = getOrCreateAVS(event.params.operatorSet.avs, event.block.timestamp);

  // Create operator set
  let operatorSetId = avs.id + "-" + event.params.operatorSet.id.toString();
  let operatorSet = new OperatorSet(operatorSetId);
  operatorSet.avs = avs.id;
  operatorSet.operatorSetId = event.params.operatorSet.id;
  operatorSet.redistributionRecipient = null;

  // Initialize counters
  operatorSet.memberCount = BigInt.fromI32(0);
  operatorSet.strategyCount = BigInt.fromI32(0);
  operatorSet.allocationCount = BigInt.fromI32(0);
  operatorSet.slashingEventCount = BigInt.fromI32(0);

  // Set timestamps
  operatorSet.createdAt = event.block.timestamp;
  operatorSet.lastActivityAt = event.block.timestamp;

  // Create creation event
  let creationEvent = new OperatorSetCreatedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  creationEvent.transactionHash = event.transaction.hash;
  creationEvent.logIndex = event.logIndex;
  creationEvent.blockNumber = event.block.number;
  creationEvent.blockTimestamp = event.block.timestamp;
  creationEvent.contractAddress = event.address;
  creationEvent.operatorSet = operatorSet.id;
  creationEvent.avs = avs.id;
  creationEvent.operatorSetId = event.params.operatorSet.id;

  // Link creation event to operator set
  operatorSet.creationEvent = creationEvent.id;

  // Update AVS counter
  avs.operatorSetCount = avs.operatorSetCount.plus(BigInt.fromI32(1));
  avs.lastActivityAt = event.block.timestamp;
  avs.updatedAt = event.block.timestamp;

  // Save entities
  avs.save();
  operatorSet.save();
  creationEvent.save();

  log.info("OperatorSetCreated processed successfully", []);
}

export function handleOperatorAddedToOperatorSet(
  event: OperatorAddedToOperatorSet
): void {
  log.info("Processing OperatorAddedToOperatorSet: operator {} to set {}", [
    event.params.operator.toHexString(),
    event.params.operatorSet.id.toString(),
  ]);

  // Load entities
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    log.warning("Operator not found for set addition: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  let operatorSetId =
    event.params.operatorSet.avs.toHexString() +
    "-" +
    event.params.operatorSet.id.toString();
  let operatorSet = OperatorSet.load(operatorSetId);
  if (operatorSet == null) {
    log.warning("OperatorSet not found: {}", [operatorSetId]);
    return;
  }

  // Update counters
  operator.operatorSetCount = operator.operatorSetCount.plus(BigInt.fromI32(1));
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  operatorSet.memberCount = operatorSet.memberCount.plus(BigInt.fromI32(1));
  operatorSet.lastActivityAt = event.block.timestamp;

  // Create membership entity
  let membershipId =
    operator.id + "-" + operatorSet.id + "-" + event.block.timestamp.toString();
  let membership = new OperatorSetMembership(membershipId);
  membership.operator = operator.id;
  membership.operatorSet = operatorSet.id;
  membership.joinedAt = event.block.timestamp;
  membership.joinedAtBlock = event.block.number;
  membership.leftAt = null;
  membership.leftAtBlock = null;
  // membership.isActive = true // TODO: Verify that this key is not needed since we can know if the membership is active using the leftAt

  // Create join event
  let joinEvent = new OperatorAddedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  joinEvent.transactionHash = event.transaction.hash;
  joinEvent.logIndex = event.logIndex;
  joinEvent.blockNumber = event.block.number;
  joinEvent.blockTimestamp = event.block.timestamp;
  joinEvent.contractAddress = event.address;
  joinEvent.operator = operator.id;
  joinEvent.operatorSet = operatorSet.id;

  // Link events
  membership.joinEvent = joinEvent.id;

  // Save entities
  operator.save();
  operatorSet.save();
  membership.save();
  joinEvent.save();

  log.info("OperatorAddedToOperatorSet processed successfully", []);
}

export function handleOperatorRemovedFromOperatorSet(
  event: OperatorRemovedFromOperatorSet
): void {
  log.info(
    "Processing OperatorRemovedFromOperatorSet: operator {} from set {}",
    [
      event.params.operator.toHexString(),
      event.params.operatorSet.id.toString(),
    ]
  );

  // Load entities
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator == null) {
    log.warning("Operator not found for set removal: {}", [
      event.params.operator.toHexString(),
    ]);
    return;
  }

  let operatorSetId =
    event.params.operatorSet.avs.toHexString() +
    "-" +
    event.params.operatorSet.id.toString();
  let operatorSet = OperatorSet.load(operatorSetId);
  if (operatorSet == null) {
    log.warning("OperatorSet not found: {}", [operatorSetId]);
    return;
  }

  // Update counters
  operator.operatorSetCount = operator.operatorSetCount.minus(
    BigInt.fromI32(1)
  );
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;

  operatorSet.memberCount = operatorSet.memberCount.minus(BigInt.fromI32(1));
  operatorSet.lastActivityAt = event.block.timestamp;

  // TODO: Update existing membership to mark as inactive - UPDATE "Will removed is active from membership instead"
  // This requires iterating through memberships to find the active one

  // Create removal event
  let removeEvent = new OperatorRemovedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  removeEvent.transactionHash = event.transaction.hash;
  removeEvent.logIndex = event.logIndex;
  removeEvent.blockNumber = event.block.number;
  removeEvent.blockTimestamp = event.block.timestamp;
  removeEvent.contractAddress = event.address;
  removeEvent.operator = operator.id;
  removeEvent.operatorSet = operatorSet.id;

  // Save entities
  operator.save();
  operatorSet.save();
  removeEvent.save();

  log.info("OperatorRemovedFromOperatorSet processed successfully", []);
}

// ========================================
// STRATEGY MANAGEMENT EVENTS
// ========================================

export function handleStrategyAddedToOperatorSet(
  event: StrategyAddedToOperatorSet
): void {
  log.info("Processing StrategyAddedToOperatorSet: set {} strategy {}", [
    event.params.operatorSet.id.toString(),
    event.params.strategy.toHexString(),
  ]);

  let operatorSetId =
    event.params.operatorSet.avs.toHexString() +
    "-" +
    event.params.operatorSet.id.toString();
  let operatorSet = OperatorSet.load(operatorSetId);
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  if (operatorSet != null) {
    operatorSet.strategyCount = operatorSet.strategyCount.plus(
      BigInt.fromI32(1)
    );
    operatorSet.lastActivityAt = event.block.timestamp;
    operatorSet.save();
  }

  strategy.lastActivityAt = event.block.timestamp;
  strategy.save();

  // Create strategy event
  let strategyEvent = new StrategyOperatorSetEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  strategyEvent.transactionHash = event.transaction.hash;
  strategyEvent.logIndex = event.logIndex;
  strategyEvent.blockNumber = event.block.number;
  strategyEvent.blockTimestamp = event.block.timestamp;
  strategyEvent.contractAddress = event.address;
  strategyEvent.operatorSet = operatorSetId;
  strategyEvent.strategy = strategy.id;
  strategyEvent.eventType = "ADDED";

  strategyEvent.save();

  log.info("StrategyAddedToOperatorSet processed successfully", []);
}

export function handleStrategyRemovedFromOperatorSet(
  event: StrategyRemovedFromOperatorSet
): void {
  log.info("Processing StrategyRemovedFromOperatorSet: set {} strategy {}", [
    event.params.operatorSet.id.toString(),
    event.params.strategy.toHexString(),
  ]);

  let operatorSetId =
    event.params.operatorSet.avs.toHexString() +
    "-" +
    event.params.operatorSet.id.toString();
  let operatorSet = OperatorSet.load(operatorSetId);
  let strategy = getOrCreateStrategy(
    event.params.strategy,
    event.block.timestamp
  );

  if (operatorSet != null) {
    operatorSet.strategyCount = operatorSet.strategyCount.minus(
      BigInt.fromI32(1)
    );
    operatorSet.lastActivityAt = event.block.timestamp;
    operatorSet.save();
  }

  strategy.lastActivityAt = event.block.timestamp;
  strategy.save();

  // Create strategy event
  let strategyEvent = new StrategyOperatorSetEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  strategyEvent.transactionHash = event.transaction.hash;
  strategyEvent.logIndex = event.logIndex;
  strategyEvent.blockNumber = event.block.number;
  strategyEvent.blockTimestamp = event.block.timestamp;
  strategyEvent.contractAddress = event.address;
  strategyEvent.operatorSet = operatorSetId;
  strategyEvent.strategy = strategy.id;
  strategyEvent.eventType = "REMOVED";

  strategyEvent.save();

  log.info("StrategyRemovedFromOperatorSet processed successfully", []);
}

// ========================================
// AVS METADATA EVENTS
// ========================================

export function handleAVSMetadataURIUpdated(
  event: AVSMetadataURIUpdated
): void {
  log.info("Processing AVSMetadataURIUpdated: AVS {}", [
    event.params.avs.toHexString(),
  ]);

  let avs = getOrCreateAVS(event.params.avs, event.block.timestamp);
  avs.metadataURI = event.params.metadataURI;
  avs.lastActivityAt = event.block.timestamp;
  avs.updatedAt = event.block.timestamp;

  // Create metadata update event
  let metadataUpdate = new AVSMetadataUpdate(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  metadataUpdate.transactionHash = event.transaction.hash;
  metadataUpdate.logIndex = event.logIndex;
  metadataUpdate.blockNumber = event.block.number;
  metadataUpdate.blockTimestamp = event.block.timestamp;
  metadataUpdate.contractAddress = event.address;
  metadataUpdate.avs = avs.id;
  metadataUpdate.metadataURI = event.params.metadataURI;

  avs.save();
  metadataUpdate.save();

  log.info("AVSMetadataURIUpdated processed successfully", []);
}

// ========================================
// CONFIGURATION EVENTS
// ========================================

export function handleRedistributionAddressSet(
  event: RedistributionAddressSet
): void {
  log.info("Processing RedistributionAddressSet: set {}", [
    event.params.operatorSet.id.toString(),
  ]);

  let operatorSetId =
    event.params.operatorSet.avs.toHexString() +
    "-" +
    event.params.operatorSet.id.toString();
  let operatorSet = OperatorSet.load(operatorSetId);

  if (operatorSet != null) {
    operatorSet.redistributionRecipient = event.params.redistributionRecipient;
    operatorSet.lastActivityAt = event.block.timestamp;
    operatorSet.save();
  }
}

// TODO: Look into this, how useful is it?
export function handleAVSRegistrarSet(event: AVSRegistrarSet): void {
  log.info("Processing AVSRegistrarSet: AVS {} registrar {}", [
    event.params.avs.toHexString(),
    event.params.registrar.toHexString(),
  ]);

  let avs = getOrCreateAVS(event.params.avs, event.block.timestamp);
  avs.lastActivityAt = event.block.timestamp;
  avs.updatedAt = event.block.timestamp;
  avs.save();
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getOrCreateAVS(address: Address, timestamp: BigInt): AVS {
  let avs = AVS.load(address.toHexString());
  if (avs == null) {
    avs = new AVS(address.toHexString());
    avs.address = address;
    avs.metadataURI = null;

    // Initialize counters
    avs.operatorSetCount = BigInt.fromI32(0);
    avs.totalOperatorRegistrations = BigInt.fromI32(0);
    avs.rewardsSubmissionCount = BigInt.fromI32(0);
    avs.slashingEventCount = BigInt.fromI32(0);

    // Set timestamps
    avs.createdAt = timestamp;
    avs.lastActivityAt = timestamp;
    avs.updatedAt = timestamp;
  }
  return avs;
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
