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
  // Minimal lookup entities
  Operator,
  AVS,
  OperatorSet,
  Strategy,
  // Event entities
  OperatorSlashed as OperatorSlashedEntity,
  AllocationDelaySet as AllocationDelaySetEntity,
  AllocationEvent,
  EncumberedMagnitudeUpdated as EncumberedMagnitudeUpdatedEntity,
  MaxMagnitudeUpdated as MaxMagnitudeUpdatedEntity,
  OperatorSetCreated as OperatorSetCreatedEntity,
  OperatorAddedToOperatorSet as OperatorAddedEntity,
  OperatorRemovedFromOperatorSet as OperatorRemovedEntity,
  RedistributionAddressSet as RedistributionAddressSetEntity,
  AVSRegistrarSet as AVSRegistrarSetEntity,
  AVSMetadataUpdate,
  StrategyOperatorSetEvent,
} from "../generated/schema";

import { log, Address, BigInt } from "@graphprotocol/graph-ts";

// ========================================
// SLASHING EVENTS
// ========================================

export function handleOperatorSlashed(event: OperatorSlashed): void {
  log.info("Processing OperatorSlashed event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // DATA QUALITY GUARD: Operator address must not be zero
  if (event.params.operator.equals(Address.zero())) {
    log.critical(
      "INVARIANT VIOLATION: OperatorSlashed with zero operator at tx {}",
      [event.transaction.hash.toHexString()],
    );
  }

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );

  // Create pure event entity with complete data
  let slashingEvent = new OperatorSlashedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields (inherited from BaseEvent interface)
  slashingEvent.transactionHash = event.transaction.hash;
  slashingEvent.logIndex = event.logIndex;
  slashingEvent.blockNumber = event.block.number;
  slashingEvent.blockTimestamp = event.block.timestamp;
  slashingEvent.contractAddress = event.address;

  // Event-specific fields
  slashingEvent.operator = operator.id;
  slashingEvent.operatorSet = operatorSet.id;
  slashingEvent.strategies = event.params.strategies.map<string>(
    (strategy: Address) => strategy.toHexString(),
  );
  slashingEvent.wadSlashed = event.params.wadSlashed;
  slashingEvent.description = event.params.description;

  // Save entities
  operator.save();
  operatorSet.save();
  slashingEvent.save();

  log.info("OperatorSlashed event saved: {}", [slashingEvent.id]);
}

// ========================================
// ALLOCATION EVENTS
// ========================================

export function handleAllocationUpdated(event: AllocationUpdated): void {
  log.info("Processing AllocationUpdated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let allocationEvent = new AllocationEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  allocationEvent.transactionHash = event.transaction.hash;
  allocationEvent.logIndex = event.logIndex;
  allocationEvent.blockNumber = event.block.number;
  allocationEvent.blockTimestamp = event.block.timestamp;
  allocationEvent.contractAddress = event.address;

  // Event-specific fields
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

  log.info("AllocationUpdated event saved: {}", [allocationEvent.id]);
}

export function handleAllocationDelaySet(event: AllocationDelaySet): void {
  log.info("Processing AllocationDelaySet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let operator = getOrCreateOperator(event.params.operator);

  // Create pure event entity
  let delayEvent = new AllocationDelaySetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  delayEvent.transactionHash = event.transaction.hash;
  delayEvent.logIndex = event.logIndex;
  delayEvent.blockNumber = event.block.number;
  delayEvent.blockTimestamp = event.block.timestamp;
  delayEvent.contractAddress = event.address;

  // Event-specific fields
  delayEvent.operator = operator.id;
  delayEvent.delay = event.params.delay;
  delayEvent.effectBlock = event.params.effectBlock;

  // Save entities
  operator.save();
  delayEvent.save();

  log.info("AllocationDelaySet event saved: {}", [delayEvent.id]);
}

export function handleEncumberedMagnitudeUpdated(
  event: EncumberedMagnitudeUpdated,
): void {
  log.info("Processing EncumberedMagnitudeUpdated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let magnitudeEvent = new EncumberedMagnitudeUpdatedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  magnitudeEvent.transactionHash = event.transaction.hash;
  magnitudeEvent.logIndex = event.logIndex;
  magnitudeEvent.blockNumber = event.block.number;
  magnitudeEvent.blockTimestamp = event.block.timestamp;
  magnitudeEvent.contractAddress = event.address;

  // Event-specific fields
  magnitudeEvent.operator = operator.id;
  magnitudeEvent.strategy = strategy.id;
  magnitudeEvent.encumberedMagnitude = event.params.encumberedMagnitude;

  // Save entities
  operator.save();
  strategy.save();
  magnitudeEvent.save();

  log.info("EncumberedMagnitudeUpdated event saved: {}", [magnitudeEvent.id]);
}

export function handleMaxMagnitudeUpdated(event: MaxMagnitudeUpdated): void {
  log.info("Processing MaxMagnitudeUpdated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let maxMagnitudeEvent = new MaxMagnitudeUpdatedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  maxMagnitudeEvent.transactionHash = event.transaction.hash;
  maxMagnitudeEvent.logIndex = event.logIndex;
  maxMagnitudeEvent.blockNumber = event.block.number;
  maxMagnitudeEvent.blockTimestamp = event.block.timestamp;
  maxMagnitudeEvent.contractAddress = event.address;

  // Event-specific fields
  maxMagnitudeEvent.operator = operator.id;
  maxMagnitudeEvent.strategy = strategy.id;
  maxMagnitudeEvent.maxMagnitude = event.params.maxMagnitude;

  // Save entities
  operator.save();
  strategy.save();
  maxMagnitudeEvent.save();

  log.info("MaxMagnitudeUpdated event saved: {}", [maxMagnitudeEvent.id]);
}

// ========================================
// OPERATOR SET EVENTS
// ========================================

export function handleOperatorSetCreated(event: OperatorSetCreated): void {
  log.info("Processing OperatorSetCreated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let avs = getOrCreateAVS(event.params.operatorSet.avs);
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );

  // Create pure event entity
  let creationEvent = new OperatorSetCreatedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  creationEvent.transactionHash = event.transaction.hash;
  creationEvent.logIndex = event.logIndex;
  creationEvent.blockNumber = event.block.number;
  creationEvent.blockTimestamp = event.block.timestamp;
  creationEvent.contractAddress = event.address;

  // Event-specific fields
  creationEvent.operatorSet = operatorSet.id;
  creationEvent.avs = avs.id;
  creationEvent.operatorSetId = event.params.operatorSet.id;

  // Save entities
  avs.save();
  operatorSet.save();
  creationEvent.save();

  log.info("OperatorSetCreated event saved: {}", [creationEvent.id]);
}

export function handleOperatorAddedToOperatorSet(
  event: OperatorAddedToOperatorSet,
): void {
  log.info("Processing OperatorAddedToOperatorSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );

  // Create pure event entity
  let joinEvent = new OperatorAddedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  joinEvent.transactionHash = event.transaction.hash;
  joinEvent.logIndex = event.logIndex;
  joinEvent.blockNumber = event.block.number;
  joinEvent.blockTimestamp = event.block.timestamp;
  joinEvent.contractAddress = event.address;

  // Event-specific fields
  joinEvent.operator = operator.id;
  joinEvent.operatorSet = operatorSet.id;

  // Save entities
  operator.save();
  operatorSet.save();
  joinEvent.save();

  log.info("OperatorAddedToOperatorSet event saved: {}", [joinEvent.id]);
}

export function handleOperatorRemovedFromOperatorSet(
  event: OperatorRemovedFromOperatorSet,
): void {
  log.info("Processing OperatorRemovedFromOperatorSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );

  // Create pure event entity
  let removeEvent = new OperatorRemovedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  removeEvent.transactionHash = event.transaction.hash;
  removeEvent.logIndex = event.logIndex;
  removeEvent.blockNumber = event.block.number;
  removeEvent.blockTimestamp = event.block.timestamp;
  removeEvent.contractAddress = event.address;

  // Event-specific fields
  removeEvent.operator = operator.id;
  removeEvent.operatorSet = operatorSet.id;

  // Save entities
  operator.save();
  operatorSet.save();
  removeEvent.save();

  log.info("OperatorRemovedFromOperatorSet event saved: {}", [removeEvent.id]);
}

// ========================================
// STRATEGY EVENTS
// ========================================

export function handleStrategyAddedToOperatorSet(
  event: StrategyAddedToOperatorSet,
): void {
  log.info("Processing StrategyAddedToOperatorSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let strategyEvent = new StrategyOperatorSetEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  strategyEvent.transactionHash = event.transaction.hash;
  strategyEvent.logIndex = event.logIndex;
  strategyEvent.blockNumber = event.block.number;
  strategyEvent.blockTimestamp = event.block.timestamp;
  strategyEvent.contractAddress = event.address;

  // Event-specific fields
  strategyEvent.operatorSet = operatorSet.id;
  strategyEvent.strategy = strategy.id;
  strategyEvent.eventType = "ADDED";

  // Save entities
  operatorSet.save();
  strategy.save();
  strategyEvent.save();

  log.info("StrategyAddedToOperatorSet event saved: {}", [strategyEvent.id]);
}

export function handleStrategyRemovedFromOperatorSet(
  event: StrategyRemovedFromOperatorSet,
): void {
  log.info("Processing StrategyRemovedFromOperatorSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );
  let strategy = getOrCreateStrategy(event.params.strategy);

  // Create pure event entity
  let strategyEvent = new StrategyOperatorSetEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  strategyEvent.transactionHash = event.transaction.hash;
  strategyEvent.logIndex = event.logIndex;
  strategyEvent.blockNumber = event.block.number;
  strategyEvent.blockTimestamp = event.block.timestamp;
  strategyEvent.contractAddress = event.address;

  // Event-specific fields
  strategyEvent.operatorSet = operatorSet.id;
  strategyEvent.strategy = strategy.id;
  strategyEvent.eventType = "REMOVED";

  // Save entities
  operatorSet.save();
  strategy.save();
  strategyEvent.save();

  log.info("StrategyRemovedFromOperatorSet event saved: {}", [
    strategyEvent.id,
  ]);
}

// ========================================
// METADATA EVENTS
// ========================================

export function handleAVSMetadataURIUpdated(
  event: AVSMetadataURIUpdated,
): void {
  log.info("Processing AVSMetadataURIUpdated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let avs = getOrCreateAVS(event.params.avs);

  // Create pure event entity
  let metadataUpdate = new AVSMetadataUpdate(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  metadataUpdate.transactionHash = event.transaction.hash;
  metadataUpdate.logIndex = event.logIndex;
  metadataUpdate.blockNumber = event.block.number;
  metadataUpdate.blockTimestamp = event.block.timestamp;
  metadataUpdate.contractAddress = event.address;

  // Event-specific fields
  metadataUpdate.avs = avs.id;
  metadataUpdate.metadataURI = event.params.metadataURI;

  // Save entities
  avs.save();
  metadataUpdate.save();

  log.info("AVSMetadataURIUpdated event saved: {}", [metadataUpdate.id]);
}

// ========================================
// CONFIGURATION EVENTS
// ========================================

export function handleRedistributionAddressSet(
  event: RedistributionAddressSet,
): void {
  log.info("Processing RedistributionAddressSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );

  // Create pure event entity
  let redistributionEvent = new RedistributionAddressSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  redistributionEvent.transactionHash = event.transaction.hash;
  redistributionEvent.logIndex = event.logIndex;
  redistributionEvent.blockNumber = event.block.number;
  redistributionEvent.blockTimestamp = event.block.timestamp;
  redistributionEvent.contractAddress = event.address;

  // Event-specific fields
  redistributionEvent.operatorSet = operatorSet.id;
  redistributionEvent.redistributionRecipient =
    event.params.redistributionRecipient;

  // Save entities
  operatorSet.save();
  redistributionEvent.save();

  log.info("RedistributionAddressSet event saved: {}", [
    redistributionEvent.id,
  ]);
}

export function handleAVSRegistrarSet(event: AVSRegistrarSet): void {
  log.info("Processing AVSRegistrarSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let avs = getOrCreateAVS(event.params.avs);

  // Create pure event entity
  let registrarEvent = new AVSRegistrarSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields
  registrarEvent.transactionHash = event.transaction.hash;
  registrarEvent.logIndex = event.logIndex;
  registrarEvent.blockNumber = event.block.number;
  registrarEvent.blockTimestamp = event.block.timestamp;
  registrarEvent.contractAddress = event.address;

  // Event-specific fields
  registrarEvent.avs = avs.id;
  registrarEvent.registrar = event.params.registrar;

  // Save entities
  avs.save();
  registrarEvent.save();

  log.info("AVSRegistrarSet event saved: {}", [registrarEvent.id]);
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

function getOrCreateAVS(address: Address): AVS {
  let avs = AVS.load(address.toHexString());
  if (avs == null) {
    avs = new AVS(address.toHexString());
    avs.address = address;
  }
  return avs;
}

function getOrCreateStrategy(address: Address): Strategy {
  let strategy = Strategy.load(address.toHexString());
  if (strategy == null) {
    strategy = new Strategy(address.toHexString());
    strategy.address = address;
  }
  return strategy;
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
