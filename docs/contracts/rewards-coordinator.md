# RewardsCoordinator Documentation

**Contract Address**: `0x7750d328b314EfFa365A0402CcfD489B80B0adda` (Mainnet)
**Start Block**: 20341793
**Source File**: `src/rewards-coordinator.ts`

## Overview

The `RewardsCoordinator` handles the economic incentives of the protocol. It manages **rewards submissions** from AVSs and the **distribution** of those rewards to operators and stakers, including commission rate configurations.

## Key Entities

### Event Entities

- `RewardsSubmission`: A standard rewards submission by an AVS.
- `OperatorDirectedAVSRewardsSubmission`: Targeted rewards submission.
- `RewardsClaimed`: Records when a user claims their accumulated rewards.
- `OperatorAVSSplitBipsSet`: Configuration of the commission split between an Operator and an AVS.
- `DistributionRootSubmitted`: Merkle root submission for a rewards distribution epoch.

## Mappings

### Rewards Submissions

These events track the flow of value from AVSs to the ecosystem.

- **`handleAVSRewardsSubmissionCreated`**: Standard AVS rewards.
- **`handleRewardsSubmissionForAllCreated`**: Rewards for all earners.
- **`handleOperatorDirectedAVSRewardsSubmissionCreated`**: Rewards directed to specific operators.

### Commission Rates (Split Bips)

Understanding commission rates is vital for economic analysis of operators.

- **`handleOperatorAVSSplitBipsSet`**: Updates the split configuration for an Operator-AVS pair.
- **`handleOperatorPISplitBipsSet`**: Updates the Programmatic Incentives split.
- **`handleOperatorSetSplitBipsSet`**: Updates the split for an Operator Set.

### Distribution & Claiming

- **`handleDistributionRootSubmitted`**: Marks the start of a new claiming epoch.
- **`handleRewardsClaimed`**: Records the actual payout of tokens to an earner.
