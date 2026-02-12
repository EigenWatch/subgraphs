import {
  OperatorAVSRegistrationStatusUpdated as OperatorAVSRegistrationStatusUpdatedEvent,
  AVSMetadataURIUpdated as AVSMetadataURIUpdatedEvent,
} from "../generated/AVSDirectory/AVSDirectory";

import {
  // Minimal lookup entities
  Operator,
  AVS,
  // Event entities only
  OperatorAVSRegistrationStatusUpdated,
} from "../generated/schema";

import { log, Address, BigInt } from "@graphprotocol/graph-ts";

// ========================================
// LEGACY M2 OPERATOR-AVS REGISTRATION
// ========================================

export function handleOperatorAVSRegistrationStatusUpdated(
  event: OperatorAVSRegistrationStatusUpdatedEvent,
): void {
  log.info("Processing OperatorAVSRegistrationStatusUpdated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let avs = getOrCreateAVS(event.params.avs);

  // Determine status string from enum
  let statusString = "UNREGISTERED";
  if (event.params.status == 1) {
    statusString = "REGISTERED";
  }

  // Create pure event entity with complete data
  let statusEvent = new OperatorAVSRegistrationStatusUpdated(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  // Base event fields (inherited from BaseEvent interface)
  statusEvent.transactionHash = event.transaction.hash;
  statusEvent.logIndex = event.logIndex;
  statusEvent.blockNumber = event.block.number;
  statusEvent.blockTimestamp = event.block.timestamp;
  statusEvent.contractAddress = event.address;

  // Event-specific fields
  statusEvent.operator = operator.id;
  statusEvent.avs = avs.id;
  statusEvent.status = statusString;

  // Save entities
  operator.save();
  avs.save();
  statusEvent.save();

  log.info("OperatorAVSRegistrationStatusUpdated event saved: {}", [
    statusEvent.id,
  ]);
}

// ========================================
// AVS METADATA UPDATES
// Note: Removed handleAVSMetadataURIUpdated to avoid duplicates
// with AllocationManager. AVS metadata is handled there.
// ========================================

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
