import {
  PodDeployed as PodDeployedEvent,
  BeaconChainETHDeposited,
  PodSharesUpdated,
  NewTotalShares,
  BeaconChainETHWithdrawalCompleted,
  BeaconChainSlashingFactorDecreased,
  BurnableETHSharesIncreased,
  PectraForkTimestampSet,
  ProofTimestampSetterSet,
} from "../generated/EigenPodManager/EigenPodManager";

import {
  // Minimal lookup entities
  Staker,
  EigenPod,
  // Event entities only
  PodDeployed,
  BeaconChainDeposit,
  PodSharesUpdate,
  BeaconChainWithdrawal,
  BeaconChainETHWithdrawalCompleted as BeaconChainETHWithdrawalCompletedEntity,
  BeaconChainSlashingEvent,
  BurnableETHSharesIncreased as BurnableETHSharesIncreasedEntity,
  PectraForkTimestampSet as PectraForkTimestampSetEntity,
  ProofTimestampSetterSet as ProofTimestampSetterSetEntity,
} from "../generated/schema";

import { log, Address, BigInt } from "@graphprotocol/graph-ts";

// ========================================
// POD LIFECYCLE EVENTS
// ========================================

export function handlePodDeployed(event: PodDeployedEvent): void {
  log.info("Processing PodDeployed event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let staker = getOrCreateStaker(event.params.podOwner);
  let pod = getOrCreateEigenPod(event.params.eigenPod, staker.id);

  // Create pure event entity
  let deploymentEvent = new PodDeployed(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  deploymentEvent.transactionHash = event.transaction.hash;
  deploymentEvent.logIndex = event.logIndex;
  deploymentEvent.blockNumber = event.block.number;
  deploymentEvent.blockTimestamp = event.block.timestamp;
  deploymentEvent.contractAddress = event.address;

  // Event-specific fields
  deploymentEvent.pod = pod.id;
  deploymentEvent.owner = staker.id;

  // Save entities
  staker.save();
  pod.save();
  deploymentEvent.save();

  log.info("PodDeployed event saved: {}", [deploymentEvent.id]);
}

// ========================================
// NATIVE ETH DEPOSITS
// ========================================

export function handleBeaconChainETHDeposited(
  event: BeaconChainETHDeposited
): void {
  log.info("Processing BeaconChainETHDeposited event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let staker = getOrCreateStaker(event.params.podOwner);

  // Create pure event entity
  let deposit = new BeaconChainDeposit(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  deposit.transactionHash = event.transaction.hash;
  deposit.logIndex = event.logIndex;
  deposit.blockNumber = event.block.number;
  deposit.blockTimestamp = event.block.timestamp;
  deposit.contractAddress = event.address;

  // Event-specific fields
  deposit.pod = null; // Will be linked in PostgreSQL via podOwner relationship
  deposit.podOwner = staker.id;
  deposit.amount = event.params.amount;

  // Save entities
  staker.save();
  deposit.save();

  log.info("BeaconChainETHDeposited event saved: {}", [deposit.id]);
}
// ========================================
// POD SHARE UPDATES
// ========================================

export function handlePodSharesUpdated(event: PodSharesUpdated): void {
  log.info("Processing PodSharesUpdated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let staker = getOrCreateStaker(event.params.podOwner);

  // Create pure event entity
  let sharesUpdate = new PodSharesUpdate(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  sharesUpdate.transactionHash = event.transaction.hash;
  sharesUpdate.logIndex = event.logIndex;
  sharesUpdate.blockNumber = event.block.number;
  sharesUpdate.blockTimestamp = event.block.timestamp;
  sharesUpdate.contractAddress = event.address;

  // Event-specific fields
  sharesUpdate.pod = null; // Will be linked in PostgreSQL
  sharesUpdate.podOwner = staker.id;
  sharesUpdate.sharesDelta = event.params.sharesDelta;
  sharesUpdate.newTotalShares = null; // This event doesn't include new total
  sharesUpdate.updateType = "SHARES_UPDATED";

  // Save entities
  staker.save();
  sharesUpdate.save();

  log.info("PodSharesUpdated event saved: {}", [sharesUpdate.id]);
}

export function handleNewTotalShares(event: NewTotalShares): void {
  log.info("Processing NewTotalShares event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let staker = getOrCreateStaker(event.params.podOwner);

  // Create pure event entity
  let sharesUpdate = new PodSharesUpdate(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  sharesUpdate.transactionHash = event.transaction.hash;
  sharesUpdate.logIndex = event.logIndex;
  sharesUpdate.blockNumber = event.block.number;
  sharesUpdate.blockTimestamp = event.block.timestamp;
  sharesUpdate.contractAddress = event.address;

  // Event-specific fields
  sharesUpdate.pod = null; // Will be linked in PostgreSQL
  sharesUpdate.podOwner = staker.id;
  sharesUpdate.sharesDelta = BigInt.fromI32(0); // Can't calculate without state
  sharesUpdate.newTotalShares = event.params.newTotalShares;
  sharesUpdate.updateType = "NEW_TOTAL_SHARES";

  // Save entities
  staker.save();
  sharesUpdate.save();

  log.info("NewTotalShares event saved: {}", [sharesUpdate.id]);
}

// ========================================
// WITHDRAWAL EVENTS
// ========================================

export function handleBeaconChainETHWithdrawalCompleted(
  event: BeaconChainETHWithdrawalCompleted
): void {
  log.info("Processing BeaconChainETHWithdrawalCompleted event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let staker = getOrCreateStaker(event.params.podOwner);

  // Create pure event entity (specific type for this withdrawal)
  let withdrawalCompleted = new BeaconChainETHWithdrawalCompletedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  withdrawalCompleted.transactionHash = event.transaction.hash;
  withdrawalCompleted.logIndex = event.logIndex;
  withdrawalCompleted.blockNumber = event.block.number;
  withdrawalCompleted.blockTimestamp = event.block.timestamp;
  withdrawalCompleted.contractAddress = event.address;

  // Event-specific fields
  withdrawalCompleted.podOwner = staker.id;
  withdrawalCompleted.shares = event.params.shares;
  withdrawalCompleted.nonce = event.params.nonce;
  withdrawalCompleted.delegatedAddress = event.params.delegatedAddress;
  withdrawalCompleted.withdrawer = event.params.withdrawer;
  withdrawalCompleted.withdrawalRoot = event.params.withdrawalRoot;

  // Also create generic BeaconChainWithdrawal event for consistency
  let withdrawal = new BeaconChainWithdrawal(
    event.transaction.hash.toHexString() +
      "-" +
      event.logIndex.toString() +
      "-generic"
  );

  withdrawal.transactionHash = event.transaction.hash;
  withdrawal.logIndex = event.logIndex;
  withdrawal.blockNumber = event.block.number;
  withdrawal.blockTimestamp = event.block.timestamp;
  withdrawal.contractAddress = event.address;
  withdrawal.pod = null; // Will be linked in PostgreSQL
  withdrawal.podOwner = staker.id;
  withdrawal.shares = event.params.shares;
  withdrawal.nonce = event.params.nonce;
  withdrawal.delegatedAddress = event.params.delegatedAddress;
  withdrawal.withdrawer = event.params.withdrawer;
  withdrawal.withdrawalRoot = event.params.withdrawalRoot;

  // Save entities
  staker.save();
  withdrawalCompleted.save();
  withdrawal.save();

  log.info("BeaconChainETHWithdrawalCompleted event saved: {}", [
    withdrawalCompleted.id,
  ]);
}

// ========================================
// SLASHING EVENTS
// ========================================

export function handleBeaconChainSlashingFactorDecreased(
  event: BeaconChainSlashingFactorDecreased
): void {
  log.info("Processing BeaconChainSlashingFactorDecreased event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let staker = getOrCreateStaker(event.params.staker);

  // Create pure event entity
  let slashingEvent = new BeaconChainSlashingEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  slashingEvent.transactionHash = event.transaction.hash;
  slashingEvent.logIndex = event.logIndex;
  slashingEvent.blockNumber = event.block.number;
  slashingEvent.blockTimestamp = event.block.timestamp;
  slashingEvent.contractAddress = event.address;

  // Event-specific fields
  slashingEvent.staker = staker.id;
  slashingEvent.prevBeaconChainSlashingFactor =
    event.params.prevBeaconChainSlashingFactor;
  slashingEvent.newBeaconChainSlashingFactor =
    event.params.newBeaconChainSlashingFactor;

  // Save entities
  staker.save();
  slashingEvent.save();

  log.info("BeaconChainSlashingFactorDecreased event saved: {}", [
    slashingEvent.id,
  ]);
}

// ========================================
// SYSTEM EVENTS
// ========================================

export function handleBurnableETHSharesIncreased(
  event: BurnableETHSharesIncreased
): void {
  log.info("Processing BurnableETHSharesIncreased event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let burnableEvent = new BurnableETHSharesIncreasedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  burnableEvent.transactionHash = event.transaction.hash;
  burnableEvent.logIndex = event.logIndex;
  burnableEvent.blockNumber = event.block.number;
  burnableEvent.blockTimestamp = event.block.timestamp;
  burnableEvent.contractAddress = event.address;

  // Event-specific fields
  burnableEvent.shares = event.params.shares;

  burnableEvent.save();

  log.info("BurnableETHSharesIncreased event saved: {}", [burnableEvent.id]);
}

export function handlePectraForkTimestampSet(
  event: PectraForkTimestampSet
): void {
  log.info("Processing PectraForkTimestampSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let pectraEvent = new PectraForkTimestampSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  pectraEvent.transactionHash = event.transaction.hash;
  pectraEvent.logIndex = event.logIndex;
  pectraEvent.blockNumber = event.block.number;
  pectraEvent.blockTimestamp = event.block.timestamp;
  pectraEvent.contractAddress = event.address;

  // Event-specific fields
  pectraEvent.newPectraForkTimestamp = event.params.newPectraForkTimestamp;

  pectraEvent.save();

  log.info("PectraForkTimestampSet event saved: {}", [pectraEvent.id]);
}

export function handleProofTimestampSetterSet(
  event: ProofTimestampSetterSet
): void {
  log.info("Processing ProofTimestampSetterSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let proofEvent = new ProofTimestampSetterSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  proofEvent.transactionHash = event.transaction.hash;
  proofEvent.logIndex = event.logIndex;
  proofEvent.blockNumber = event.block.number;
  proofEvent.blockTimestamp = event.block.timestamp;
  proofEvent.contractAddress = event.address;

  // Event-specific fields
  proofEvent.newProofTimestampSetter = event.params.newProofTimestampSetter;

  proofEvent.save();

  log.info("ProofTimestampSetterSet event saved: {}", [proofEvent.id]);
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

function getOrCreateEigenPod(address: Address, ownerId: string): EigenPod {
  let pod = EigenPod.load(address.toHexString());
  if (pod == null) {
    pod = new EigenPod(address.toHexString());
    pod.address = address;
    pod.owner = ownerId;
  }
  return pod;
}
