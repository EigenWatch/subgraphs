import {
  ExecutorOperatorSetRegistered,
  ExecutorOperatorSetTaskConfigSet,
  TaskCreated,
  TaskVerified,
  FeeRefunded,
  FeeSplitSet,
  FeeSplitCollectorSet,
} from "../generated/TaskMailbox/TaskMailbox";

import {
  AVS,
  ExecutorOperatorSetRegistered as ExecutorOperatorSetRegisteredEntity,
  ExecutorOperatorSetTaskConfigSet as ExecutorOperatorSetTaskConfigSetEntity,
  TaskCreated as TaskCreatedEntity,
  TaskVerified as TaskVerifiedEntity,
  TaskFeeRefunded,
  TaskMailboxFeeSplitSet,
  TaskMailboxFeeSplitCollectorSet,
} from "../generated/schema";

import { log, Address, BigInt, json, JSONValueKind } from "@graphprotocol/graph-ts";

// ========================================
// EXECUTOR OPERATOR SET EVENTS
// ========================================

export function handleExecutorOperatorSetRegistered(
  event: ExecutorOperatorSetRegistered,
): void {
  log.info("Processing ExecutorOperatorSetRegistered event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let avs = getOrCreateAVS(event.params.avs);

  let entity = new ExecutorOperatorSetRegisteredEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.caller = event.params.caller;
  entity.avs = avs.id;
  entity.executorOperatorSetId = BigInt.fromI32(
    event.params.executorOperatorSetId,
  );
  entity.isRegistered = event.params.isRegistered;

  avs.save();
  entity.save();

  log.info("ExecutorOperatorSetRegistered event saved: {}", [entity.id]);
}

export function handleExecutorOperatorSetTaskConfigSet(
  event: ExecutorOperatorSetTaskConfigSet,
): void {
  log.info("Processing ExecutorOperatorSetTaskConfigSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let avs = getOrCreateAVS(event.params.avs);

  let entity = new ExecutorOperatorSetTaskConfigSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.caller = event.params.caller;
  entity.avs = avs.id;
  entity.executorOperatorSetId = BigInt.fromI32(
    event.params.executorOperatorSetId,
  );

  // Serialize the ExecutorOperatorSetTaskConfig struct to a JSON string.
  // Fields: taskHook, taskSLA, feeToken, curveType, feeCollector, consensus{type,value}, taskMetadata
  let cfg = event.params.config;
  let configJson =
    '{"taskHook":"' +
    cfg.taskHook.toHexString() +
    '","taskSLA":"' +
    cfg.taskSLA.toString() +
    '","feeToken":"' +
    cfg.feeToken.toHexString() +
    '","curveType":' +
    cfg.curveType.toString() +
    ',"feeCollector":"' +
    cfg.feeCollector.toHexString() +
    '","consensus":{"consensusType":' +
    cfg.consensus.consensusType.toString() +
    ',"value":"' +
    cfg.consensus.value.toHexString() +
    '"},"taskMetadata":"' +
    cfg.taskMetadata.toHexString() +
    '"}';

  entity.config = configJson;

  avs.save();
  entity.save();

  log.info("ExecutorOperatorSetTaskConfigSet event saved: {}", [entity.id]);
}

// ========================================
// TASK LIFECYCLE EVENTS
// ========================================

export function handleTaskCreated(event: TaskCreated): void {
  log.info("Processing TaskCreated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let avs = getOrCreateAVS(event.params.avs);

  let entity = new TaskCreatedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.creator = event.params.creator;
  entity.taskHash = event.params.taskHash;
  entity.avs = avs.id;
  entity.executorOperatorSetId = BigInt.fromI32(
    event.params.executorOperatorSetId,
  );
  entity.operatorTableReferenceTimestamp = BigInt.fromI32(
    event.params.operatorTableReferenceTimestamp,
  );
  entity.refundCollector = event.params.refundCollector;
  entity.avsFee = event.params.avsFee;
  entity.taskDeadline = event.params.taskDeadline;
  entity.payload = event.params.payload;

  avs.save();
  entity.save();

  log.info("TaskCreated event saved: {}", [entity.id]);
}

export function handleTaskVerified(event: TaskVerified): void {
  log.info("Processing TaskVerified event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let avs = getOrCreateAVS(event.params.avs);

  let entity = new TaskVerifiedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.aggregator = event.params.aggregator;
  entity.taskHash = event.params.taskHash;
  entity.avs = avs.id;
  entity.executorOperatorSetId = BigInt.fromI32(
    event.params.executorOperatorSetId,
  );
  entity.executorCert = event.params.executorCert;
  entity.result = event.params.result;

  avs.save();
  entity.save();

  log.info("TaskVerified event saved: {}", [entity.id]);
}

export function handleFeeRefunded(event: FeeRefunded): void {
  log.info("Processing FeeRefunded event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let entity = new TaskFeeRefunded(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.refundCollector = event.params.refundCollector;
  entity.taskHash = event.params.taskHash;
  entity.avsFee = event.params.avsFee;

  entity.save();

  log.info("FeeRefunded event saved: {}", [entity.id]);
}

// ========================================
// CONFIGURATION EVENTS
// ========================================

export function handleFeeSplitSet(event: FeeSplitSet): void {
  log.info("Processing FeeSplitSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let entity = new TaskMailboxFeeSplitSet(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.feeSplit = event.params.feeSplit;

  entity.save();

  log.info("FeeSplitSet event saved: {}", [entity.id]);
}

export function handleFeeSplitCollectorSet(
  event: FeeSplitCollectorSet,
): void {
  log.info("Processing FeeSplitCollectorSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let entity = new TaskMailboxFeeSplitCollectorSet(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.feeSplitCollector = event.params.feeSplitCollector;

  entity.save();

  log.info("FeeSplitCollectorSet event saved: {}", [entity.id]);
}

// ========================================
// HELPERS
// ========================================

function getOrCreateAVS(address: Address): AVS {
  let avs = AVS.load(address.toHexString());
  if (avs == null) {
    avs = new AVS(address.toHexString());
    avs.address = address;
  }
  return avs;
}
