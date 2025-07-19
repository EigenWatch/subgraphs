import {
  PodDeployed as PodDeployedEvent,
  BeaconChainETHDeposited,
  PodSharesUpdated,
  NewTotalShares,
  BeaconChainETHWithdrawalCompleted,
  BeaconChainSlashingFactorDecreased,
  BurnableETHSharesIncreased,
} from "../generated/EigenPodManager/EigenPodManager";

import {
  Staker,
  EigenPod,
  PodDeployed,
  BeaconChainDeposit,
  PodSharesUpdate,
  BeaconChainWithdrawal,
  BeaconChainSlashingEvent,
} from "../generated/schema";

import { BigInt, log, Address } from "@graphprotocol/graph-ts";

// ========================================
// POD LIFECYCLE EVENTS
// ========================================

export function handlePodDeployed(event: PodDeployedEvent): void {
  log.info("Processing PodDeployed: pod {} owner {}", [
    event.params.eigenPod.toHexString(),
    event.params.podOwner.toHexString(),
  ]);

  // Get or create staker (pod owner)
  let staker = getOrCreateStaker(event.params.podOwner, event.block.timestamp);

  // Create EigenPod entity
  let pod = new EigenPod(event.params.eigenPod.toHexString());
  pod.address = event.params.eigenPod;
  pod.owner = staker.id;

  // Initialize metrics
  pod.totalShares = BigInt.fromI32(0);
  pod.depositCount = BigInt.fromI32(0);
  pod.withdrawalCount = BigInt.fromI32(0);

  // Set timestamps
  pod.deployedAt = event.block.timestamp;
  pod.lastActivityAt = event.block.timestamp;

  // Create deployment event
  let deploymentEvent = new PodDeployed(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  deploymentEvent.transactionHash = event.transaction.hash;
  deploymentEvent.logIndex = event.logIndex;
  deploymentEvent.blockNumber = event.block.number;
  deploymentEvent.blockTimestamp = event.block.timestamp;
  deploymentEvent.contractAddress = event.address;
  deploymentEvent.pod = pod.id;
  deploymentEvent.owner = staker.id;

  // Link deployment event to pod
  pod.deploymentEvent = deploymentEvent.id;

  // Update staker
  staker.lastActivityAt = event.block.timestamp;

  // Save entities
  staker.save();
  pod.save();
  deploymentEvent.save();

  log.info("PodDeployed processed successfully", []);
}

// ========================================
// NATIVE ETH DEPOSITS
// ========================================

export function handleBeaconChainETHDeposited(
  event: BeaconChainETHDeposited
): void {
  log.info("Processing BeaconChainETHDeposited: pod owner {} amount {}", [
    event.params.podOwner.toHexString(),
    event.params.amount.toString(),
  ]);

  // Load staker
  let staker = getOrCreateStaker(event.params.podOwner, event.block.timestamp);

  // Get the pod (should be exactly one pod per staker)
  let pod: EigenPod | null = null;
  let eigenPods = staker.eigenPods.load();
  if (eigenPods.length > 0) {
    pod = eigenPods[0];
  }

  // Create deposit event
  let deposit = new BeaconChainDeposit(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  deposit.transactionHash = event.transaction.hash;
  deposit.logIndex = event.logIndex;
  deposit.blockNumber = event.block.number;
  deposit.blockTimestamp = event.block.timestamp;
  deposit.contractAddress = event.address;
  deposit.pod = pod != null ? pod.id : null;
  deposit.podOwner = staker.id;
  deposit.amount = event.params.amount;

  // Update pod metrics if pod exists
  if (pod != null) {
    pod.depositCount = pod.depositCount.plus(BigInt.fromI32(1));
    pod.lastActivityAt = event.block.timestamp;
    pod.save();
  } else {
    log.warning("No EigenPod found for staker {} - this shouldn't happen", [
      staker.id,
    ]);
  }

  // Update staker
  staker.lastActivityAt = event.block.timestamp;

  // Save entities
  staker.save();
  deposit.save();

  log.info("BeaconChainETHDeposited processed successfully", []);
}

// ========================================
// CRITICAL POD SHARE UPDATES (INCLUDES SLASHING EFFECTS)
// ========================================

export function handlePodSharesUpdated(event: PodSharesUpdated): void {
  log.info("Processing PodSharesUpdated: pod owner {} shares delta {}", [
    event.params.podOwner.toHexString(),
    event.params.sharesDelta.toString(),
  ]);

  // Load staker
  let staker = getOrCreateStaker(event.params.podOwner, event.block.timestamp);

  // Get the pod (should be exactly one pod per staker)
  let pod: EigenPod | null = null;
  let eigenPods = staker.eigenPods.load();
  if (eigenPods.length > 0) {
    pod = eigenPods[0];
  }

  // Create pod shares update event
  let sharesUpdate = new PodSharesUpdate(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  sharesUpdate.transactionHash = event.transaction.hash;
  sharesUpdate.logIndex = event.logIndex;
  sharesUpdate.blockNumber = event.block.number;
  sharesUpdate.blockTimestamp = event.block.timestamp;
  sharesUpdate.contractAddress = event.address;
  sharesUpdate.pod = pod != null ? pod.id : null; // NOW SET CORRECTLY
  sharesUpdate.podOwner = staker.id;
  sharesUpdate.sharesDelta = event.params.sharesDelta;
  sharesUpdate.newTotalShares = null; // This event doesn't include new total
  sharesUpdate.updateType = "SHARES_UPDATED";

  // UPDATE POD SHARES - THIS IS THE KEY PART
  if (pod != null) {
    // Update pod's total shares with the delta
    pod.totalShares = pod.totalShares.plus(event.params.sharesDelta);

    // Set the newTotalShares in the event for reference
    sharesUpdate.newTotalShares = pod.totalShares;

    pod.lastActivityAt = event.block.timestamp;
    pod.save();
  } else {
    log.warning("No EigenPod found for staker {} during shares update", [
      staker.id,
    ]);
  }

  // Update staker
  staker.lastActivityAt = event.block.timestamp;

  // Important: Negative sharesDelta could indicate slashing!
  if (event.params.sharesDelta.lt(BigInt.fromI32(0))) {
    log.warning(
      "POTENTIAL SLASHING: Pod owner {} lost {} shares, new total: {}",
      [
        event.params.podOwner.toHexString(),
        event.params.sharesDelta.abs().toString(),
        pod != null ? pod.totalShares.toString() : "unknown",
      ]
    );
  }

  // Save entities
  staker.save();
  sharesUpdate.save();

  log.info("PodSharesUpdated processed successfully", []);
}

export function handleNewTotalShares(event: NewTotalShares): void {
  log.info("Processing NewTotalShares: pod owner {} new total {}", [
    event.params.podOwner.toHexString(),
    event.params.newTotalShares.toString(),
  ]);

  // Load staker
  let staker = getOrCreateStaker(event.params.podOwner, event.block.timestamp);

  // Get the pod (should be exactly one pod per staker)
  let pod: EigenPod | null = null;
  let eigenPods = staker.eigenPods.load();
  if (eigenPods.length > 0) {
    pod = eigenPods[0];
  }

  // Calculate delta from old total to new total
  let sharesDelta = BigInt.fromI32(0);
  if (pod != null) {
    sharesDelta = event.params.newTotalShares.minus(pod.totalShares);
  }

  // Create pod shares update event
  let sharesUpdate = new PodSharesUpdate(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  sharesUpdate.transactionHash = event.transaction.hash;
  sharesUpdate.logIndex = event.logIndex;
  sharesUpdate.blockNumber = event.block.number;
  sharesUpdate.blockTimestamp = event.block.timestamp;
  sharesUpdate.contractAddress = event.address;
  sharesUpdate.pod = pod != null ? pod.id : null; // NOW SET CORRECTLY
  sharesUpdate.podOwner = staker.id;
  sharesUpdate.sharesDelta = sharesDelta; // NOW CALCULATED
  sharesUpdate.newTotalShares = event.params.newTotalShares;
  sharesUpdate.updateType = "NEW_TOTAL_SHARES";

  // UPDATE POD SHARES - CRITICAL
  if (pod != null) {
    let oldTotal = pod.totalShares;
    pod.totalShares = event.params.newTotalShares; // Set to absolute new total
    pod.lastActivityAt = event.block.timestamp;

    // Log significant changes
    if (sharesDelta.lt(BigInt.fromI32(0))) {
      log.warning(
        "SHARES DECREASED: Pod owner {} shares: {} -> {}, delta: {}",
        [
          event.params.podOwner.toHexString(),
          oldTotal.toString(),
          pod.totalShares.toString(),
          sharesDelta.toString(),
        ]
      );
    } else if (sharesDelta.gt(BigInt.fromI32(0))) {
      log.info("SHARES INCREASED: Pod owner {} shares: {} -> {}, delta: +{}", [
        event.params.podOwner.toHexString(),
        oldTotal.toString(),
        pod.totalShares.toString(),
        sharesDelta.toString(),
      ]);
    }

    pod.save();
  } else {
    log.warning(
      "No EigenPod found for staker {} during new total shares update",
      [staker.id]
    );
  }

  // Update staker
  staker.lastActivityAt = event.block.timestamp;

  // Save entities
  staker.save();
  sharesUpdate.save();

  log.info("NewTotalShares processed successfully", []);
}

// ========================================
// WITHDRAWALS
// ========================================

export function handleBeaconChainETHWithdrawalCompleted(
  event: BeaconChainETHWithdrawalCompleted
): void {
  log.info(
    "Processing BeaconChainETHWithdrawalCompleted: pod owner {} shares {}",
    [event.params.podOwner.toHexString(), event.params.shares.toString()]
  );

  // Load staker
  let staker = getOrCreateStaker(event.params.podOwner, event.block.timestamp);

  // Get the pod (should be exactly one pod per staker)
  let pod: EigenPod | null = null;
  let eigenPods = staker.eigenPods.load();
  if (eigenPods.length > 0) {
    pod = eigenPods[0];
  }

  // Create withdrawal event
  let withdrawal = new BeaconChainWithdrawal(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  withdrawal.transactionHash = event.transaction.hash;
  withdrawal.logIndex = event.logIndex;
  withdrawal.blockNumber = event.block.number;
  withdrawal.blockTimestamp = event.block.timestamp;
  withdrawal.contractAddress = event.address;
  withdrawal.pod = pod != null ? pod.id : null; // NOW SET CORRECTLY
  withdrawal.podOwner = staker.id;
  withdrawal.shares = event.params.shares;
  withdrawal.nonce = event.params.nonce;
  withdrawal.delegatedAddress = event.params.delegatedAddress;
  withdrawal.withdrawer = event.params.withdrawer;
  withdrawal.withdrawalRoot = event.params.withdrawalRoot;

  // Update pod metrics
  if (pod != null) {
    pod.withdrawalCount = pod.withdrawalCount.plus(BigInt.fromI32(1));
    pod.lastActivityAt = event.block.timestamp;
    pod.save();
  } else {
    log.warning("No EigenPod found for staker {} during withdrawal", [
      staker.id,
    ]);
  }

  // Update staker
  staker.withdrawalCount = staker.withdrawalCount.plus(BigInt.fromI32(1));
  staker.lastActivityAt = event.block.timestamp;

  // Save entities
  staker.save();
  withdrawal.save();

  log.info("BeaconChainETHWithdrawalCompleted processed successfully", []);
}

// ========================================
// CRITICAL BEACON CHAIN SLASHING (DIRECT VALIDATOR PENALTIES)
// ========================================

export function handleBeaconChainSlashingFactorDecreased(
  event: BeaconChainSlashingFactorDecreased
): void {
  log.critical("BEACON CHAIN SLASHING: Pod owner {} factor {} -> {}", [
    event.params.staker.toHexString(),
    event.params.prevBeaconChainSlashingFactor.toString(),
    event.params.newBeaconChainSlashingFactor.toString(),
  ]);

  // Load staker
  let staker = getOrCreateStaker(event.params.staker, event.block.timestamp);

  // Create slashing event
  let slashingEvent = new BeaconChainSlashingEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  slashingEvent.transactionHash = event.transaction.hash;
  slashingEvent.logIndex = event.logIndex;
  slashingEvent.blockNumber = event.block.number;
  slashingEvent.blockTimestamp = event.block.timestamp;
  slashingEvent.contractAddress = event.address;
  slashingEvent.staker = staker.id;
  slashingEvent.prevBeaconChainSlashingFactor =
    event.params.prevBeaconChainSlashingFactor;
  slashingEvent.newBeaconChainSlashingFactor =
    event.params.newBeaconChainSlashingFactor;

  // Update staker - this is a serious event
  staker.lastActivityAt = event.block.timestamp;

  // Save entities
  staker.save();
  slashingEvent.save();

  log.critical(
    "BEACON CHAIN SLASHING PROCESSED: Staker {} slashed on beacon chain",
    [staker.id]
  );
}

// ========================================
// SHARE BURNING (POST-SLASHING RESOLUTION)
// ========================================

export function handleBurnableETHSharesIncreased(
  event: BurnableETHSharesIncreased
): void {
  log.info("Processing BurnableETHSharesIncreased: shares {}", [
    event.params.shares.toString(),
  ]);

  // This is a system-wide event indicating ETH shares that can be burned
  // Usually happens after slashing events as part of the resolution process

  log.info(
    "BurnableETHSharesIncreased processed: {} shares marked for burning",
    [event.params.shares.toString()]
  );
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
