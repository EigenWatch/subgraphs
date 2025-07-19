import {
  OperatorAVSRegistrationStatusUpdated as OperatorAVSRegistrationStatusUpdatedEvent,
  AVSMetadataURIUpdated as AVSMetadataURIUpdatedEvent,
} from "../generated/AVSDirectory/AVSDirectory";

import {
  Operator,
  AVS,
  OperatorAVSRegistration,
  OperatorAVSRegistrationStatusUpdated,
  AVSMetadataUpdate,
} from "../generated/schema";

import { BigInt, log, Address, Bytes } from "@graphprotocol/graph-ts";

// TODO: Consider discarding this file in the future
// This file is used for legacy M2 operator-AVS registration events and AVS metadata
// updates.

// ========================================
// LEGACY M2 OPERATOR-AVS REGISTRATION (STILL USED BY SOME AVS)
// ========================================

export function handleOperatorAVSRegistrationStatusUpdated(
  event: OperatorAVSRegistrationStatusUpdatedEvent
): void {
  log.info(
    "Processing OperatorAVSRegistrationStatusUpdated: operator {} AVS {} status {}",
    [
      event.params.operator.toHexString(),
      event.params.avs.toHexString(),
      event.params.status.toString(),
    ]
  );

  // Load or create entities
  let operator = getOrCreateOperator(
    event.params.operator,
    event.block.timestamp
  );
  let avs = getOrCreateAVS(event.params.avs, event.block.timestamp);

  // Determine status
  let statusString = "UNREGISTERED";
  if (event.params.status == 1) {
    statusString = "REGISTERED";
    // Increment AVS registration count for operator
    operator.avsRegistrationCount = operator.avsRegistrationCount.plus(
      BigInt.fromI32(1)
    );
    // Increment operator registration count for AVS
    avs.totalOperatorRegistrations = avs.totalOperatorRegistrations.plus(
      BigInt.fromI32(1)
    );
  } else {
    // Decrement counts if unregistering
    if (operator.avsRegistrationCount.gt(BigInt.fromI32(0))) {
      operator.avsRegistrationCount = operator.avsRegistrationCount.minus(
        BigInt.fromI32(1)
      );
    }
    if (avs.totalOperatorRegistrations.gt(BigInt.fromI32(0))) {
      avs.totalOperatorRegistrations = avs.totalOperatorRegistrations.minus(
        BigInt.fromI32(1)
      );
    }
  }

  // Update activity timestamps
  operator.lastActivityAt = event.block.timestamp;
  operator.updatedAt = event.block.timestamp;
  avs.lastActivityAt = event.block.timestamp;
  avs.updatedAt = event.block.timestamp;

  // Create registration status event
  let statusEvent = new OperatorAVSRegistrationStatusUpdated(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  statusEvent.transactionHash = event.transaction.hash;
  statusEvent.logIndex = event.logIndex;
  statusEvent.blockNumber = event.block.number;
  statusEvent.blockTimestamp = event.block.timestamp;
  statusEvent.contractAddress = event.address;
  statusEvent.operator = operator.id;
  statusEvent.avs = avs.id;
  statusEvent.status = statusString;

  // Create or update registration relationship
  let registrationId =
    operator.id + "-" + avs.id + "-" + event.block.timestamp.toString();
  let registration = new OperatorAVSRegistration(registrationId);
  registration.operator = operator.id;
  registration.avs = avs.id;
  registration.status = statusString;
  registration.event = statusEvent.id;
  registration.transactionHash = event.transaction.hash;
  registration.blockNumber = event.block.number;
  registration.blockTimestamp = event.block.timestamp;

  // Save all entities
  operator.save();
  avs.save();
  statusEvent.save();
  registration.save();

  log.info(
    "OperatorAVSRegistrationStatusUpdated processed: {} {} with AVS {}",
    [operator.id, statusString, avs.id]
  );
}

// ========================================
// AVS METADATA UPDATES (DUPLICATE OF ALLOCATION MANAGER EVENT)
// ========================================

export function handleAVSMetadataURIUpdated(
  event: AVSMetadataURIUpdatedEvent
): void {
  log.info("Processing AVSMetadataURIUpdated (AVSDirectory): AVS {} URI {}", [
    event.params.avs.toHexString(),
    event.params.metadataURI,
  ]);

  // Get or create AVS
  let avs = getOrCreateAVS(event.params.avs, event.block.timestamp);

  // Update metadata
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

  // Save entities
  avs.save();
  metadataUpdate.save();

  log.info("AVSMetadataURIUpdated (AVSDirectory) processed successfully", []);
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getOrCreateOperator(address: Address, timestamp: BigInt): Operator {
  let operator = Operator.load(address.toHexString());
  if (operator == null) {
    operator = new Operator(address.toHexString());
    operator.address = address;
    operator.delegationApprover = Address.zero();
    operator.metadataURI = null;

    // Initialize counters
    operator.delegatorCount = BigInt.fromI32(0);
    operator.avsRegistrationCount = BigInt.fromI32(0);
    operator.operatorSetCount = BigInt.fromI32(0);
    operator.slashingEventCount = BigInt.fromI32(0);

    // Set registration info (will be updated if registration event is processed)
    operator.registeredAt = timestamp;
    operator.registeredAtBlock = BigInt.fromI32(0);
    operator.registeredAtTransaction = Bytes.empty();

    // Set activity timestamps
    operator.lastActivityAt = timestamp;
    operator.updatedAt = timestamp;

    // Note: registrationEvent will be null since this is created from AVS registration
    // The proper registration event should come from DelegationManager
  }
  return operator;
}

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
