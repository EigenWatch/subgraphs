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
  RewardsUpdaterSet,
  RewardsForAllSubmitterSet,
  ClaimerForSet,
} from "../generated/RewardsCoordinator/RewardsCoordinator";

import {
  // Minimal lookup entities
  Operator,
  AVS,
  OperatorSet,
  // Event entities only
  RewardsSubmission,
  OperatorDirectedAVSRewardsSubmission,
  OperatorDirectedOperatorSetRewardsSubmission,
  RewardsUpdaterSet as RewardsUpdaterSetEntity,
  RewardsForAllSubmitterSet as RewardsForAllSubmitterSetEntity,
  ActivationDelaySet as ActivationDelaySetEntity,
  DefaultOperatorSplitBipsSet as DefaultOperatorSplitBipsSetEntity,
  OperatorAVSSplitBipsSet as OperatorAVSSplitBipsSetEntity,
  OperatorPISplitBipsSet as OperatorPISplitBipsSetEntity,
  OperatorSetSplitBipsSet as OperatorSetSplitBipsSetEntity,
  ClaimerForSet as ClaimerForSetEntity,
  DistributionRootSubmitted as DistributionRootSubmittedEntity,
  DistributionRootDisabled as DistributionRootDisabledEntity,
  RewardsClaimed as RewardsClaimedEntity,
} from "../generated/schema";

import { log, Address, BigInt } from "@graphprotocol/graph-ts";

// ========================================
// REWARDS SUBMISSION EVENTS
// ========================================

export function handleAVSRewardsSubmissionCreated(
  event: AVSRewardsSubmissionCreated
): void {
  log.info("Processing AVSRewardsSubmissionCreated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let avs = getOrCreateAVS(event.params.avs);

  // Create pure event entity
  let submission = new RewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;

  // Event-specific fields
  submission.avs = avs.id;
  submission.submitter = event.params.avs;
  submission.submissionNonce = event.params.submissionNonce;
  submission.rewardsSubmissionHash = event.params.rewardsSubmissionHash;
  submission.submissionType = "AVS_REWARDS";

  // Extract and encode submission details as JSON
  let rewardsSubmission = event.params.rewardsSubmission;
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

  log.info("AVSRewardsSubmissionCreated event saved: {}", [submission.id]);
}

export function handleRewardsSubmissionForAllCreated(
  event: RewardsSubmissionForAllCreated
): void {
  log.info("Processing RewardsSubmissionForAllCreated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let submission = new RewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;

  // Event-specific fields
  submission.avs = null; // No specific AVS
  submission.submitter = event.params.submitter;
  submission.submissionNonce = event.params.submissionNonce;
  submission.rewardsSubmissionHash = event.params.rewardsSubmissionHash;
  submission.submissionType = "REWARDS_FOR_ALL";

  // Extract submission details
  let rewardsSubmission = event.params.rewardsSubmission;
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

  log.info("RewardsSubmissionForAllCreated event saved: {}", [submission.id]);
}

export function handleRewardsSubmissionForAllEarnersCreated(
  event: RewardsSubmissionForAllEarnersCreated
): void {
  log.info("Processing RewardsSubmissionForAllEarnersCreated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let submission = new RewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;

  // Event-specific fields
  submission.avs = null; // No specific AVS
  submission.submitter = event.params.tokenHopper;
  submission.submissionNonce = event.params.submissionNonce;
  submission.rewardsSubmissionHash = event.params.rewardsSubmissionHash;
  submission.submissionType = "REWARDS_FOR_ALL_EARNERS";

  // Extract submission details
  let rewardsSubmission = event.params.rewardsSubmission;
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

  log.info("RewardsSubmissionForAllEarnersCreated event saved: {}", [
    submission.id,
  ]);
}

export function handleOperatorDirectedAVSRewardsSubmissionCreated(
  event: OperatorDirectedAVSRewardsSubmissionCreated
): void {
  log.info("Processing OperatorDirectedAVSRewardsSubmissionCreated event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let avs = getOrCreateAVS(event.params.avs);

  // Create pure event entity
  let submission = new OperatorDirectedAVSRewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;

  // Event-specific fields
  submission.caller = event.params.caller;
  submission.avs = avs.id;
  submission.operatorDirectedRewardsSubmissionHash =
    event.params.operatorDirectedRewardsSubmissionHash;
  submission.submissionNonce = event.params.submissionNonce;

  // Extract submission details
  let rewardsSubmission = event.params.operatorDirectedRewardsSubmission;

  // Encode strategies and multipliers
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
  submission.description = rewardsSubmission.description;

  // Encode operator rewards
  let rewardsResult: string[] = [];
  for (let i = 0; i < rewardsSubmission.operatorRewards.length; i++) {
    let reward = rewardsSubmission.operatorRewards[i];
    rewardsResult.push(
      `{"operator":"${reward.operator.toHexString()}","amount":"${reward.amount.toString()}"}`
    );
  }
  submission.operatorRewards = `[${rewardsResult.join(",")}]`;

  // Save entities
  avs.save();
  submission.save();

  log.info("OperatorDirectedAVSRewardsSubmissionCreated event saved: {}", [
    submission.id,
  ]);
}

export function handleOperatorDirectedOperatorSetRewardsSubmissionCreated(
  event: OperatorDirectedOperatorSetRewardsSubmissionCreated
): void {
  log.info(
    "Processing OperatorDirectedOperatorSetRewardsSubmissionCreated event: {}",
    [event.transaction.hash.toHexString()]
  );

  // Create minimal lookup entities if needed
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id
  );

  // Create pure event entity
  let submission = new OperatorDirectedOperatorSetRewardsSubmission(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  submission.transactionHash = event.transaction.hash;
  submission.logIndex = event.logIndex;
  submission.blockNumber = event.block.number;
  submission.blockTimestamp = event.block.timestamp;
  submission.contractAddress = event.address;

  // Event-specific fields
  submission.caller = event.params.caller;
  submission.operatorDirectedRewardsSubmissionHash =
    event.params.operatorDirectedRewardsSubmissionHash;
  submission.operatorSet = operatorSet.id;
  submission.submissionNonce = event.params.submissionNonce;

  // Extract submission details
  let rewardsSubmission = event.params.operatorDirectedRewardsSubmission;

  // Encode strategies and multipliers
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
  submission.description = rewardsSubmission.description;

  // Encode operator rewards
  let rewardsResult: string[] = [];
  for (let i = 0; i < rewardsSubmission.operatorRewards.length; i++) {
    let reward = rewardsSubmission.operatorRewards[i];
    rewardsResult.push(
      `{"operator":"${reward.operator.toHexString()}","amount":"${reward.amount.toString()}"}`
    );
  }
  submission.operatorRewards = `[${rewardsResult.join(",")}]`;

  // Save entities
  operatorSet.save();
  submission.save();

  log.info(
    "OperatorDirectedOperatorSetRewardsSubmissionCreated event saved: {}",
    [submission.id]
  );
}

// ========================================
// COMMISSION RATE EVENTS
// ========================================

export function handleOperatorAVSSplitBipsSet(
  event: OperatorAVSSplitBipsSet
): void {
  log.info("Processing OperatorAVSSplitBipsSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let avs = getOrCreateAVS(event.params.avs);

  // Create pure event entity
  let splitEvent = new OperatorAVSSplitBipsSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  splitEvent.transactionHash = event.transaction.hash;
  splitEvent.logIndex = event.logIndex;
  splitEvent.blockNumber = event.block.number;
  splitEvent.blockTimestamp = event.block.timestamp;
  splitEvent.contractAddress = event.address;

  // Event-specific fields
  splitEvent.caller = event.params.caller;
  splitEvent.operator = operator.id;
  splitEvent.avs = avs.id;
  splitEvent.activatedAt = event.params.activatedAt;
  splitEvent.oldOperatorAVSSplitBips = BigInt.fromI32(
    event.params.oldOperatorAVSSplitBips
  );
  splitEvent.newOperatorAVSSplitBips = BigInt.fromI32(
    event.params.newOperatorAVSSplitBips
  );

  // Save entities
  operator.save();
  avs.save();
  splitEvent.save();

  log.info("OperatorAVSSplitBipsSet event saved: {}", [splitEvent.id]);
}

export function handleOperatorPISplitBipsSet(
  event: OperatorPISplitBipsSet
): void {
  log.info("Processing OperatorPISplitBipsSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entity if needed
  let operator = getOrCreateOperator(event.params.operator);

  // Create pure event entity
  let splitEvent = new OperatorPISplitBipsSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  splitEvent.transactionHash = event.transaction.hash;
  splitEvent.logIndex = event.logIndex;
  splitEvent.blockNumber = event.block.number;
  splitEvent.blockTimestamp = event.block.timestamp;
  splitEvent.contractAddress = event.address;

  // Event-specific fields
  splitEvent.caller = event.params.caller;
  splitEvent.operator = operator.id;
  splitEvent.activatedAt = event.params.activatedAt;
  splitEvent.oldOperatorPISplitBips = BigInt.fromI32(
    event.params.oldOperatorPISplitBips
  );
  splitEvent.newOperatorPISplitBips = BigInt.fromI32(
    event.params.newOperatorPISplitBips
  );

  // Save entities
  operator.save();
  splitEvent.save();

  log.info("OperatorPISplitBipsSet event saved: {}", [splitEvent.id]);
}

export function handleOperatorSetSplitBipsSet(
  event: OperatorSetSplitBipsSet
): void {
  log.info("Processing OperatorSetSplitBipsSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create minimal lookup entities if needed
  let operator = getOrCreateOperator(event.params.operator);
  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id
  );

  // Create pure event entity
  let splitEvent = new OperatorSetSplitBipsSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  splitEvent.transactionHash = event.transaction.hash;
  splitEvent.logIndex = event.logIndex;
  splitEvent.blockNumber = event.block.number;
  splitEvent.blockTimestamp = event.block.timestamp;
  splitEvent.contractAddress = event.address;

  // Event-specific fields
  splitEvent.caller = event.params.caller;
  splitEvent.operator = operator.id;
  splitEvent.operatorSet = operatorSet.id;
  splitEvent.activatedAt = event.params.activatedAt;
  splitEvent.oldOperatorSetSplitBips = BigInt.fromI32(
    event.params.oldOperatorSetSplitBips
  );
  splitEvent.newOperatorSetSplitBips = BigInt.fromI32(
    event.params.newOperatorSetSplitBips
  );

  // Save entities
  operator.save();
  operatorSet.save();
  splitEvent.save();

  log.info("OperatorSetSplitBipsSet event saved: {}", [splitEvent.id]);
}

// ========================================
// DISTRIBUTION AND CLAIMING EVENTS
// ========================================

export function handleDistributionRootSubmitted(
  event: DistributionRootSubmitted
): void {
  log.info("Processing DistributionRootSubmitted event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let distributionEvent = new DistributionRootSubmittedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  distributionEvent.transactionHash = event.transaction.hash;
  distributionEvent.logIndex = event.logIndex;
  distributionEvent.blockNumber = event.block.number;
  distributionEvent.blockTimestamp = event.block.timestamp;
  distributionEvent.contractAddress = event.address;

  // Event-specific fields
  distributionEvent.rootIndex = event.params.rootIndex;
  distributionEvent.root = event.params.root;
  distributionEvent.rewardsCalculationEndTimestamp =
    event.params.rewardsCalculationEndTimestamp;
  distributionEvent.activatedAt = event.params.activatedAt;

  distributionEvent.save();

  log.info("DistributionRootSubmitted event saved: {}", [distributionEvent.id]);
}

export function handleDistributionRootDisabled(
  event: DistributionRootDisabled
): void {
  log.info("Processing DistributionRootDisabled event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let distributionEvent = new DistributionRootDisabledEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  distributionEvent.transactionHash = event.transaction.hash;
  distributionEvent.logIndex = event.logIndex;
  distributionEvent.blockNumber = event.block.number;
  distributionEvent.blockTimestamp = event.block.timestamp;
  distributionEvent.contractAddress = event.address;

  // Event-specific fields
  distributionEvent.rootIndex = event.params.rootIndex;

  distributionEvent.save();

  log.info("DistributionRootDisabled event saved: {}", [distributionEvent.id]);
}

export function handleRewardsClaimed(event: RewardsClaimed): void {
  log.info("Processing RewardsClaimed event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let claimedEvent = new RewardsClaimedEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  claimedEvent.transactionHash = event.transaction.hash;
  claimedEvent.logIndex = event.logIndex;
  claimedEvent.blockNumber = event.block.number;
  claimedEvent.blockTimestamp = event.block.timestamp;
  claimedEvent.contractAddress = event.address;

  // Event-specific fields
  claimedEvent.root = event.params.root;
  claimedEvent.earner = event.params.earner;
  claimedEvent.claimer = event.params.claimer;
  claimedEvent.recipient = event.params.recipient;
  claimedEvent.token = event.params.token;
  claimedEvent.claimedAmount = event.params.claimedAmount;

  claimedEvent.save();

  log.info("RewardsClaimed event saved: {}", [claimedEvent.id]);
}

// ========================================
// SYSTEM CONFIGURATION EVENTS
// ========================================

export function handleRewardsUpdaterSet(event: RewardsUpdaterSet): void {
  log.info("Processing RewardsUpdaterSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let updaterEvent = new RewardsUpdaterSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  updaterEvent.transactionHash = event.transaction.hash;
  updaterEvent.logIndex = event.logIndex;
  updaterEvent.blockNumber = event.block.number;
  updaterEvent.blockTimestamp = event.block.timestamp;
  updaterEvent.contractAddress = event.address;

  // Event-specific fields
  updaterEvent.oldRewardsUpdater = event.params.oldRewardsUpdater;
  updaterEvent.newRewardsUpdater = event.params.newRewardsUpdater;

  updaterEvent.save();

  log.info("RewardsUpdaterSet event saved: {}", [updaterEvent.id]);
}

export function handleRewardsForAllSubmitterSet(
  event: RewardsForAllSubmitterSet
): void {
  log.info("Processing RewardsForAllSubmitterSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let submitterEvent = new RewardsForAllSubmitterSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  submitterEvent.transactionHash = event.transaction.hash;
  submitterEvent.logIndex = event.logIndex;
  submitterEvent.blockNumber = event.block.number;
  submitterEvent.blockTimestamp = event.block.timestamp;
  submitterEvent.contractAddress = event.address;

  // Event-specific fields
  submitterEvent.rewardsForAllSubmitter = event.params.rewardsForAllSubmitter;
  submitterEvent.oldValue = event.params.oldValue;
  submitterEvent.newValue = event.params.newValue;

  submitterEvent.save();

  log.info("RewardsForAllSubmitterSet event saved: {}", [submitterEvent.id]);
}

export function handleActivationDelaySet(event: ActivationDelaySet): void {
  log.info("Processing ActivationDelaySet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let delayEvent = new ActivationDelaySetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  delayEvent.transactionHash = event.transaction.hash;
  delayEvent.logIndex = event.logIndex;
  delayEvent.blockNumber = event.block.number;
  delayEvent.blockTimestamp = event.block.timestamp;
  delayEvent.contractAddress = event.address;

  // Event-specific fields
  delayEvent.oldActivationDelay = event.params.oldActivationDelay;
  delayEvent.newActivationDelay = event.params.newActivationDelay;

  delayEvent.save();

  log.info("ActivationDelaySet event saved: {}", [delayEvent.id]);
}

export function handleDefaultOperatorSplitBipsSet(
  event: DefaultOperatorSplitBipsSet
): void {
  log.info("Processing DefaultOperatorSplitBipsSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let splitEvent = new DefaultOperatorSplitBipsSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  splitEvent.transactionHash = event.transaction.hash;
  splitEvent.logIndex = event.logIndex;
  splitEvent.blockNumber = event.block.number;
  splitEvent.blockTimestamp = event.block.timestamp;
  splitEvent.contractAddress = event.address;

  // Event-specific fields
  splitEvent.oldDefaultOperatorSplitBips = BigInt.fromI32(
    event.params.oldDefaultOperatorSplitBips
  );
  splitEvent.newDefaultOperatorSplitBips = BigInt.fromI32(
    event.params.newDefaultOperatorSplitBips
  );

  splitEvent.save();

  log.info("DefaultOperatorSplitBipsSet event saved: {}", [splitEvent.id]);
}

export function handleClaimerForSet(event: ClaimerForSet): void {
  log.info("Processing ClaimerForSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  // Create pure event entity
  let claimerEvent = new ClaimerForSetEntity(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );

  // Base event fields
  claimerEvent.transactionHash = event.transaction.hash;
  claimerEvent.logIndex = event.logIndex;
  claimerEvent.blockNumber = event.block.number;
  claimerEvent.blockTimestamp = event.block.timestamp;
  claimerEvent.contractAddress = event.address;

  // Event-specific fields
  claimerEvent.earner = event.params.earner;
  claimerEvent.oldClaimer = event.params.oldClaimer;
  claimerEvent.claimer = event.params.claimer;

  claimerEvent.save();

  log.info("ClaimerForSet event saved: {}", [claimerEvent.id]);
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

function getOrCreateOperatorSet(
  avsAddress: Address,
  operatorSetId: BigInt
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
