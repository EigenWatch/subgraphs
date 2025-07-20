import {
  AVSRewardsSubmissionCreated,
  RewardsSubmissionForAllCreated,
  RewardsSubmissionForAllEarnersCreated,
  OperatorDirectedAVSRewardsSubmissionCreated,
  OperatorDirectedOperatorSetRewardsSubmissionCreated,
  OperatorAVSSplitBipsSet,
  OperatorPISplitBipsSet,
  OperatorSetSplitBipsSet,
  DistributionRootSubmitted,
  DistributionRootDisabled,
  RewardsClaimed,
  ActivationDelaySet,
  DefaultOperatorSplitBipsSet,
} from "../generated/RewardsCoordinator/RewardsCoordinator";

import {
  Operator,
  AVS,
  OperatorSet,
  RewardsSubmission,
  OperatorCommissionEvent,
  DistributionRootEvent,
  RewardsClaimed as RewardsClaimedEntity,
} from "../generated/schema";

import { BigInt, log, Address } from "@graphprotocol/graph-ts";

// ========================================
// REWARDS SUBMISSION EVENTS (TRACK AVS ECONOMIC ACTIVITY)6
// ========================================

export function handleAVSRewardsSubmissionCreated(
  event: AVSRewardsSubmissionCreated
): void {
  log.info("Processing AVSRewardsSubmissionCreated: AVS {} nonce {}", [
    event.params.avs.toHexString(),
    event.params.submissionNonce.toString(),
  ]);

  // Get or create AVS
  let avs = getOrCreateAVS(event.params.avs, event.block.timestamp);
  avs.rewardsSubmissionCount = avs.rewardsSubmissionCount.plus(
    BigInt.fromI32(1)
  );
  avs.lastActivityAt = event.block.timestamp;
  avs.updatedAt = event.block.timestamp;

  // Create rewards submission entity
  let submission = new RewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;
  submission.avs = avs.id;
  submission.submitter = event.params.avs; // AVS is the submitter
  submission.submissionNonce = event.params.submissionNonce;
  submission.rewardsSubmissionHash = event.params.rewardsSubmissionHash;
  submission.submissionType = "AVS_REWARDS";

  // Extract submission details from the struct
  let rewardsSubmission = event.params.rewardsSubmission;

  // Inline strategiesAndMultipliers encoding
  let strategiesResult: string[] = [];
  for (let i = 0; i < rewardsSubmission.strategiesAndMultipliers.length; i++) {
    let item = rewardsSubmission.strategiesAndMultipliers[i];
    strategiesResult.push(
      `{"strategy":"${item.strategy.toHexString()}","multiplier":"${item.multiplier.toString()}"}`
    );
  }
  submission.strategiesAndMultipliers = `[${strategiesResult.join(",")}]`;

  submission.token = rewardsSubmission.token;
  submission.amount = rewardsSubmission.amount;
  submission.startTimestamp = rewardsSubmission.startTimestamp;
  submission.duration = rewardsSubmission.duration;

  // Save entities
  avs.save();
  submission.save();

  log.info("AVSRewardsSubmissionCreated processed successfully", []);
}

export function handleRewardsSubmissionForAllCreated(
  event: RewardsSubmissionForAllCreated
): void {
  log.info("Processing RewardsSubmissionForAllCreated: submitter {} nonce {}", [
    event.params.submitter.toHexString(),
    event.params.submissionNonce.toString(),
  ]);

  // Create rewards submission entity
  let submission = new RewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;
  submission.avs = null; // No specific AVS for "for all" submissions
  submission.submitter = event.params.submitter;
  submission.submissionNonce = event.params.submissionNonce;
  submission.rewardsSubmissionHash = event.params.rewardsSubmissionHash;
  submission.submissionType = "REWARDS_FOR_ALL";

  // Extract submission details
  let rewardsSubmission = event.params.rewardsSubmission;

  // Inline strategiesAndMultipliers encoding
  let strategiesResult: string[] = [];
  for (let i = 0; i < rewardsSubmission.strategiesAndMultipliers.length; i++) {
    let item = rewardsSubmission.strategiesAndMultipliers[i];
    strategiesResult.push(
      `{"strategy":"${item.strategy.toHexString()}","multiplier":"${item.multiplier.toString()}"}`
    );
  }
  submission.strategiesAndMultipliers = `[${strategiesResult.join(",")}]`;

  submission.token = rewardsSubmission.token;
  submission.amount = rewardsSubmission.amount;
  submission.startTimestamp = rewardsSubmission.startTimestamp;
  submission.duration = rewardsSubmission.duration;

  submission.save();

  log.info("RewardsSubmissionForAllCreated processed successfully", []);
}

export function handleRewardsSubmissionForAllEarnersCreated(
  event: RewardsSubmissionForAllEarnersCreated
): void {
  log.info(
    "Processing RewardsSubmissionForAllEarnersCreated: tokenHopper {} nonce {}",
    [
      event.params.tokenHopper.toHexString(),
      event.params.submissionNonce.toString(),
    ]
  );

  // Create rewards submission entity
  let submission = new RewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;
  submission.avs = null; // No specific AVS for "for all earners" submissions
  submission.submitter = event.params.tokenHopper;
  submission.submissionNonce = event.params.submissionNonce;
  submission.rewardsSubmissionHash = event.params.rewardsSubmissionHash;
  submission.submissionType = "REWARDS_FOR_ALL_EARNERS";

  // Extract submission details
  let rewardsSubmission = event.params.rewardsSubmission;

  // Inline strategiesAndMultipliers encoding
  let strategiesResult: string[] = [];
  for (let i = 0; i < rewardsSubmission.strategiesAndMultipliers.length; i++) {
    let item = rewardsSubmission.strategiesAndMultipliers[i];
    strategiesResult.push(
      `{"strategy":"${item.strategy.toHexString()}","multiplier":"${item.multiplier.toString()}"}`
    );
  }
  submission.strategiesAndMultipliers = `[${strategiesResult.join(",")}]`;

  submission.token = rewardsSubmission.token;
  submission.amount = rewardsSubmission.amount;
  submission.startTimestamp = rewardsSubmission.startTimestamp;
  submission.duration = rewardsSubmission.duration;

  submission.save();

  log.info("RewardsSubmissionForAllEarnersCreated processed successfully", []);
}

export function handleOperatorDirectedAVSRewardsSubmissionCreated(
  event: OperatorDirectedAVSRewardsSubmissionCreated
): void {
  log.info(
    "Processing OperatorDirectedAVSRewardsSubmissionCreated: caller {} AVS {}",
    [event.params.caller.toHexString(), event.params.avs.toHexString()]
  );

  // Get or create AVS
  let avs = getOrCreateAVS(event.params.avs, event.block.timestamp);
  avs.rewardsSubmissionCount = avs.rewardsSubmissionCount.plus(
    BigInt.fromI32(1)
  );
  avs.lastActivityAt = event.block.timestamp;
  avs.updatedAt = event.block.timestamp;

  // Create rewards submission entity
  let submission = new RewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;
  submission.avs = avs.id;
  submission.submitter = event.params.caller;
  submission.submissionNonce = event.params.submissionNonce;
  submission.rewardsSubmissionHash =
    event.params.operatorDirectedRewardsSubmissionHash;
  submission.submissionType = "OPERATOR_DIRECTED_AVS";

  // Extract submission details from the operator-directed struct
  let rewardsSubmission = event.params.operatorDirectedRewardsSubmission;

  // Inline strategiesAndMultipliers encoding
  let strategiesResult: string[] = [];
  for (let i = 0; i < rewardsSubmission.strategiesAndMultipliers.length; i++) {
    let item = rewardsSubmission.strategiesAndMultipliers[i];
    strategiesResult.push(
      `{"strategy":"${item.strategy.toHexString()}","multiplier":"${item.multiplier.toString()}"}`
    );
  }
  submission.strategiesAndMultipliers = `[${strategiesResult.join(",")}]`;

  submission.token = rewardsSubmission.token;
  submission.startTimestamp = rewardsSubmission.startTimestamp;
  submission.duration = rewardsSubmission.duration;

  // Inline operatorRewards encoding and total calculation
  let rewardsResult: string[] = [];
  let totalAmount = BigInt.fromI32(0);
  for (let i = 0; i < rewardsSubmission.operatorRewards.length; i++) {
    let reward = rewardsSubmission.operatorRewards[i];
    rewardsResult.push(
      `{"operator":"${reward.operator.toHexString()}","amount":"${reward.amount.toString()}"}`
    );
    totalAmount = totalAmount.plus(reward.amount);
  }
  submission.operatorRewards = `[${rewardsResult.join(",")}]`;
  submission.amount = totalAmount;
  submission.description = rewardsSubmission.description;

  // Save entities
  avs.save();
  submission.save();

  log.info(
    "OperatorDirectedAVSRewardsSubmissionCreated processed successfully",
    []
  );
}

// Replace the existing function with this corrected version:
export function handleOperatorDirectedOperatorSetRewardsSubmissionCreated(
  event: OperatorDirectedOperatorSetRewardsSubmissionCreated
): void {
  log.info(
    "Processing OperatorDirectedOperatorSetRewardsSubmissionCreated: caller {} operatorSet {}",
    [event.params.caller.toHexString(), event.params.operatorSet.id.toString()]
  );

  // Load entities
  let operatorSetId =
    event.params.operatorSet.avs.toHexString() +
    "-" +
    event.params.operatorSet.id.toString();
  let operatorSet = OperatorSet.load(operatorSetId);
  let avs = getOrCreateAVS(event.params.operatorSet.avs, event.block.timestamp);

  if (operatorSet != null) {
    operatorSet.lastActivityAt = event.block.timestamp;
    operatorSet.save();
  }

  avs.rewardsSubmissionCount = avs.rewardsSubmissionCount.plus(
    BigInt.fromI32(1)
  );
  avs.lastActivityAt = event.block.timestamp;
  avs.updatedAt = event.block.timestamp;

  // Create rewards submission entity
  let submission = new RewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;
  submission.avs = avs.id;
  submission.submitter = event.params.caller;
  submission.submissionNonce = event.params.submissionNonce;
  submission.rewardsSubmissionHash =
    event.params.operatorDirectedRewardsSubmissionHash;
  submission.submissionType = "OPERATOR_DIRECTED_OPERATOR_SET";

  // Extract submission details
  let rewardsSubmission = event.params.operatorDirectedRewardsSubmission;

  // Inline strategiesAndMultipliers encoding
  let strategiesResult: string[] = [];
  for (let i = 0; i < rewardsSubmission.strategiesAndMultipliers.length; i++) {
    let item = rewardsSubmission.strategiesAndMultipliers[i];
    strategiesResult.push(
      `{"strategy":"${item.strategy.toHexString()}","multiplier":"${item.multiplier.toString()}"}`
    );
  }
  submission.strategiesAndMultipliers = `[${strategiesResult.join(",")}]`;

  submission.token = rewardsSubmission.token;
  submission.startTimestamp = rewardsSubmission.startTimestamp;
  submission.duration = rewardsSubmission.duration;

  // Inline operatorRewards encoding and total calculation
  let rewardsResult: string[] = [];
  let totalAmount = BigInt.fromI32(0);
  for (let i = 0; i < rewardsSubmission.operatorRewards.length; i++) {
    let reward = rewardsSubmission.operatorRewards[i];
    rewardsResult.push(
      `{"operator":"${reward.operator.toHexString()}","amount":"${reward.amount.toString()}"}`
    );
    totalAmount = totalAmount.plus(reward.amount);
  }
  submission.operatorRewards = `[${rewardsResult.join(",")}]`;
  submission.amount = totalAmount;
  submission.description = rewardsSubmission.description;
  submission.operatorSetId = operatorSetId; // Store the operator set ID

  avs.save();
  submission.save();

  log.info(
    "OperatorDirectedOperatorSetRewardsSubmissionCreated processed successfully",
    []
  );
}

// ========================================
// CRITICAL COMMISSION RATE CHANGES (KEY FOR ECONOMIC BEHAVIOR)
// ========================================

export function handleOperatorAVSSplitBipsSet(
  event: OperatorAVSSplitBipsSet
): void {
  log.info("COMMISSION CHANGE: Operator {} AVS {} split {} -> {}", [
    event.params.operator.toHexString(),
    event.params.avs.toHexString(),
    event.params.oldOperatorAVSSplitBips.toString(),
    event.params.newOperatorAVSSplitBips.toString(),
  ]);

  // Load entities
  let operator = Operator.load(event.params.operator.toHexString());
  let avs = getOrCreateAVS(event.params.avs, event.block.timestamp);

  if (operator != null) {
    operator.lastActivityAt = event.block.timestamp;
    operator.updatedAt = event.block.timestamp;
    operator.save();
  }

  avs.lastActivityAt = event.block.timestamp;
  avs.updatedAt = event.block.timestamp;
  avs.save();

  // Create commission event
  let commissionEvent = new OperatorCommissionEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  commissionEvent.transactionHash = event.transaction.hash;
  commissionEvent.logIndex = event.logIndex;
  commissionEvent.blockNumber = event.block.number;
  commissionEvent.blockTimestamp = event.block.timestamp;
  commissionEvent.contractAddress = event.address;
  commissionEvent.operator =
    operator != null ? operator.id : event.params.operator.toHexString();
  commissionEvent.caller = event.params.caller;
  commissionEvent.commissionType = "AVS_SPECIFIC";
  commissionEvent.activatedAt = event.params.activatedAt;
  commissionEvent.oldCommissionBips = new BigInt(
    event.params.oldOperatorAVSSplitBips
  );
  commissionEvent.newCommissionBips = new BigInt(
    event.params.newOperatorAVSSplitBips
  );
  commissionEvent.targetAVS = avs.id;
  commissionEvent.targetOperatorSet = null;

  commissionEvent.save();

  log.info("OperatorAVSSplitBipsSet processed successfully", []);
}

export function handleOperatorPISplitBipsSet(
  event: OperatorPISplitBipsSet
): void {
  log.info("COMMISSION CHANGE: Operator {} PI split {} -> {}", [
    event.params.operator.toHexString(),
    event.params.oldOperatorPISplitBips.toString(),
    event.params.newOperatorPISplitBips.toString(),
  ]);

  // Load operator
  let operator = Operator.load(event.params.operator.toHexString());
  if (operator != null) {
    operator.lastActivityAt = event.block.timestamp;
    operator.updatedAt = event.block.timestamp;
    operator.save();
  }

  // Create commission event
  let commissionEvent = new OperatorCommissionEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  commissionEvent.transactionHash = event.transaction.hash;
  commissionEvent.logIndex = event.logIndex;
  commissionEvent.blockNumber = event.block.number;
  commissionEvent.blockTimestamp = event.block.timestamp;
  commissionEvent.contractAddress = event.address;
  commissionEvent.operator =
    operator != null ? operator.id : event.params.operator.toHexString();
  commissionEvent.caller = event.params.caller;
  commissionEvent.commissionType = "PI_SPECIFIC";
  commissionEvent.activatedAt = event.params.activatedAt;
  commissionEvent.oldCommissionBips = new BigInt(
    event.params.oldOperatorPISplitBips
  );
  commissionEvent.newCommissionBips = new BigInt(
    event.params.newOperatorPISplitBips
  );
  commissionEvent.targetAVS = null;
  commissionEvent.targetOperatorSet = null;

  commissionEvent.save();

  log.info("OperatorPISplitBipsSet processed successfully", []);
}

export function handleOperatorSetSplitBipsSet(
  event: OperatorSetSplitBipsSet
): void {
  log.info("COMMISSION CHANGE: Operator {} OperatorSet {} split {} -> {}", [
    event.params.operator.toHexString(),
    event.params.operatorSet.id.toString(),
    event.params.oldOperatorSetSplitBips.toString(),
    event.params.newOperatorSetSplitBips.toString(),
  ]);

  // Load entities
  let operator = Operator.load(event.params.operator.toHexString());
  let operatorSetId =
    event.params.operatorSet.avs.toHexString() +
    "-" +
    event.params.operatorSet.id.toString();
  let operatorSet = OperatorSet.load(operatorSetId);

  if (operator != null) {
    operator.lastActivityAt = event.block.timestamp;
    operator.updatedAt = event.block.timestamp;
    operator.save();
  }

  if (operatorSet != null) {
    operatorSet.lastActivityAt = event.block.timestamp;
    operatorSet.save();
  }

  // Create commission event
  let commissionEvent = new OperatorCommissionEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  commissionEvent.transactionHash = event.transaction.hash;
  commissionEvent.logIndex = event.logIndex;
  commissionEvent.blockNumber = event.block.number;
  commissionEvent.blockTimestamp = event.block.timestamp;
  commissionEvent.contractAddress = event.address;
  commissionEvent.operator =
    operator != null ? operator.id : event.params.operator.toHexString();
  commissionEvent.caller = event.params.caller;
  commissionEvent.commissionType = "OPERATOR_SET_SPECIFIC";
  commissionEvent.activatedAt = event.params.activatedAt;
  commissionEvent.oldCommissionBips = new BigInt(
    event.params.oldOperatorSetSplitBips
  );
  commissionEvent.newCommissionBips = new BigInt(
    event.params.newOperatorSetSplitBips
  );
  commissionEvent.targetAVS = operatorSet != null ? operatorSet.avs : null;
  commissionEvent.targetOperatorSet =
    operatorSet != null ? operatorSet.id : null;

  commissionEvent.save();

  log.info("OperatorSetSplitBipsSet processed successfully", []);
}

// ========================================
// DISTRIBUTION AND CLAIMING EVENTS
// ========================================

export function handleDistributionRootSubmitted(
  event: DistributionRootSubmitted
): void {
  log.info("Processing DistributionRootSubmitted: root index {} root {}", [
    event.params.rootIndex.toString(),
    event.params.root.toHexString(),
  ]);

  // Create distribution root event
  let distributionEvent = new DistributionRootEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  distributionEvent.transactionHash = event.transaction.hash;
  distributionEvent.logIndex = event.logIndex;
  distributionEvent.blockNumber = event.block.number;
  distributionEvent.blockTimestamp = event.block.timestamp;
  distributionEvent.contractAddress = event.address;
  distributionEvent.rootIndex = event.params.rootIndex;
  distributionEvent.root = event.params.root;
  distributionEvent.rewardsCalculationEndTimestamp =
    event.params.rewardsCalculationEndTimestamp;
  distributionEvent.activatedAt = event.params.activatedAt;
  distributionEvent.eventType = "SUBMITTED";

  distributionEvent.save();

  log.info("DistributionRootSubmitted processed successfully", []);
}

export function handleDistributionRootDisabled(
  event: DistributionRootDisabled
): void {
  log.info("Processing DistributionRootDisabled: root index {}", [
    event.params.rootIndex.toString(),
  ]);

  // Create distribution root event
  let distributionEvent = new DistributionRootEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  distributionEvent.transactionHash = event.transaction.hash;
  distributionEvent.logIndex = event.logIndex;
  distributionEvent.blockNumber = event.block.number;
  distributionEvent.blockTimestamp = event.block.timestamp;
  distributionEvent.contractAddress = event.address;
  distributionEvent.rootIndex = event.params.rootIndex;
  distributionEvent.root = null;
  distributionEvent.rewardsCalculationEndTimestamp = null;
  distributionEvent.activatedAt = null;
  distributionEvent.eventType = "DISABLED";

  distributionEvent.save();

  log.info("DistributionRootDisabled processed successfully", []);
}

export function handleRewardsClaimed(event: RewardsClaimed): void {
  log.info("Processing RewardsClaimed: earner {} amount {}", [
    event.params.earner.toHexString(),
    event.params.claimedAmount.toString(),
  ]);

  // Create rewards claimed event
  let claimedEvent = new RewardsClaimedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  claimedEvent.transactionHash = event.transaction.hash;
  claimedEvent.logIndex = event.logIndex;
  claimedEvent.blockNumber = event.block.number;
  claimedEvent.blockTimestamp = event.block.timestamp;
  claimedEvent.contractAddress = event.address;
  claimedEvent.root = event.params.root;
  claimedEvent.earner = event.params.earner;
  claimedEvent.claimer = event.params.claimer;
  claimedEvent.recipient = event.params.recipient;
  claimedEvent.token = event.params.token;
  claimedEvent.claimedAmount = event.params.claimedAmount;

  claimedEvent.save();

  log.info("RewardsClaimed processed successfully", []);
}

// ========================================
// SYSTEM CONFIGURATION EVENTS
// ========================================

// TODO: Access Use
export function handleActivationDelaySet(event: ActivationDelaySet): void {
  log.info("Processing ActivationDelaySet: old {} new {}", [
    event.params.oldActivationDelay.toString(),
    event.params.newActivationDelay.toString(),
  ]);

  // This is a system-wide configuration change
  // We'll track it but it doesn't directly impact individual risk assessments

  log.info("ActivationDelaySet processed successfully", []);
}

// TODO: Acess use
export function handleDefaultOperatorSplitBipsSet(
  event: DefaultOperatorSplitBipsSet
): void {
  log.info("Processing DefaultOperatorSplitBipsSet: old {} new {}", [
    event.params.oldDefaultOperatorSplitBips.toString(),
    event.params.newDefaultOperatorSplitBips.toString(),
  ]);

  // This is a system-wide default configuration
  // We'll track it but it doesn't directly impact individual risk assessments

  log.info("DefaultOperatorSplitBipsSet processed successfully", []);
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
