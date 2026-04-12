import {
  OperatorSetConfigured,
  KeyRegistered,
  KeyDeregistered,
} from "../generated/KeyRegistrar/KeyRegistrar";

import {
  AVS,
  Operator,
  OperatorSet,
  OperatorSetKeyConfig,
  KeyRegistrationEvent,
} from "../generated/schema";

import { log, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

// ========================================
// KEY REGISTRAR EVENTS
// ========================================

export function handleOperatorSetConfigured(
  event: OperatorSetConfigured,
): void {
  log.info("Processing OperatorSetConfigured event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );

  // OperatorSetKeyConfig is mutable and keyed by operatorSet ID.
  // The contract reverts on duplicate configuration (ConfigurationAlreadySet),
  // so this is a create-only path in practice.
  let config = new OperatorSetKeyConfig(operatorSet.id);
  config.operatorSet = operatorSet.id;
  config.curveType = curveTypeToString(event.params.curveType);
  config.activeKeyCount = BigInt.fromI32(0);
  config.configuredAtBlock = event.block.number;
  config.configuredAtTimestamp = event.block.timestamp;

  operatorSet.save();
  config.save();

  log.info("OperatorSetConfigured saved for operatorSet: {}", [operatorSet.id]);
}

export function handleKeyRegistered(event: KeyRegistered): void {
  log.info("Processing KeyRegistered event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );
  let operator = getOrCreateOperator(event.params.operator);

  // Update mutable activeKeyCount
  let config = OperatorSetKeyConfig.load(operatorSet.id);
  if (config != null) {
    config.activeKeyCount = config.activeKeyCount.plus(BigInt.fromI32(1));
    config.save();
  } else {
    log.warning(
      "KeyRegistered: OperatorSetKeyConfig not found for operatorSet {}",
      [operatorSet.id],
    );
  }

  let entity = new KeyRegistrationEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.operatorSet = operatorSet.id;
  entity.operator = operator.id;
  entity.curveType = curveTypeToString(event.params.curveType);
  entity.pubkey = event.params.pubkey;
  entity.eventType = "REGISTERED";

  operatorSet.save();
  operator.save();
  entity.save();

  log.info("KeyRegistered event saved: {}", [entity.id]);
}

export function handleKeyDeregistered(event: KeyDeregistered): void {
  log.info("Processing KeyDeregistered event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );
  let operator = getOrCreateOperator(event.params.operator);

  // Update mutable activeKeyCount (guard against underflow)
  let config = OperatorSetKeyConfig.load(operatorSet.id);
  if (config != null) {
    if (config.activeKeyCount.gt(BigInt.fromI32(0))) {
      config.activeKeyCount = config.activeKeyCount.minus(BigInt.fromI32(1));
    }
    config.save();
  } else {
    log.warning(
      "KeyDeregistered: OperatorSetKeyConfig not found for operatorSet {}",
      [operatorSet.id],
    );
  }

  let entity = new KeyRegistrationEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.operatorSet = operatorSet.id;
  entity.operator = operator.id;
  entity.curveType = curveTypeToString(event.params.curveType);
  entity.pubkey = Bytes.empty(); // no pubkey on deregister
  entity.eventType = "DEREGISTERED";

  operatorSet.save();
  operator.save();
  entity.save();

  log.info("KeyDeregistered event saved: {}", [entity.id]);
}

// ========================================
// HELPERS
// ========================================

// CurveType enum: NONE=0, ECDSA=1, BN254=2
function curveTypeToString(curveType: i32): string {
  if (curveType == 1) return "ECDSA";
  if (curveType == 2) return "BN254";
  return "NONE";
}

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

    let avs = getOrCreateAVS(avsAddress);
    avs.save();
  }
  return operatorSet;
}
