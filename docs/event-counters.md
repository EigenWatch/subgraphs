# Event Counters

## Overview

The subgraph maintains per-entity-type event counters to enable data completeness tracking between the subgraph and downstream consumers (pipelines, dashboards). Each counter tracks the total number of events indexed for a given entity type.

## Schema

```graphql
type EventCounter @entity(immutable: false) {
  id: ID!                    # Entity type name (e.g. "OperatorRegisteredEntity")
  count: BigInt!             # Total events indexed for this type
  lastUpdatedBlock: BigInt!  # Block number of the most recent event
  lastUpdatedTimestamp: BigInt! # Timestamp of the most recent event
}
```

## How It Works

Every event handler in the subgraph calls `incrementEventCounter` after saving its primary entity. The counter ID matches the entity type name, so the counter for `Deposit` entities has ID `"Deposit"`, the counter for `OperatorShareEvent` entities has ID `"OperatorShareEvent"`, and so on.

Handlers that create multiple entity types (e.g. `handleStakerForceUndelegated` creates both a `StakerForceUndelegatedEntity` and a `StakerDelegationEvent`) increment a counter for each type.

## Querying Counters

### Get all counters

```graphql
{
  eventCounters {
    id
    count
    lastUpdatedBlock
    lastUpdatedTimestamp
  }
}
```

### Get counters with sync status

```graphql
{
  eventCounters {
    id
    count
    lastUpdatedBlock
  }
  _meta {
    block { number }
    hasIndexingErrors
  }
}
```

### Get a specific counter

```graphql
{
  eventCounter(id: "Deposit") {
    count
    lastUpdatedBlock
    lastUpdatedTimestamp
  }
}
```

## Counter IDs by Contract

### Delegation Manager

| Counter ID | Source Handler |
|---|---|
| `OperatorRegisteredEntity` | `handleOperatorRegistered` |
| `DelegationApproverUpdatedEntity` | `handleDelegationApproverUpdated` |
| `OperatorMetadataUpdate` | `handleOperatorMetadataURIUpdated` |
| `StakerDelegationEvent` | `handleStakerDelegated`, `handleStakerUndelegated`, `handleStakerForceUndelegated` |
| `StakerForceUndelegatedEntity` | `handleStakerForceUndelegated` |
| `OperatorShareEvent` | `handleOperatorSharesIncreased`, `handleOperatorSharesDecreased`, `handleOperatorSharesSlashed` |
| `OperatorSharesSlashedEntity` | `handleOperatorSharesSlashed` |
| `WithdrawalEvent` | `handleSlashingWithdrawalQueued`, `handleSlashingWithdrawalCompleted` |
| `DepositScalingFactorUpdatedEntity` | `handleDepositScalingFactorUpdated` |

### Allocation Manager

| Counter ID | Source Handler |
|---|---|
| `OperatorSlashedEntity` | `handleOperatorSlashed` |
| `AllocationEvent` | `handleAllocationUpdated` |
| `AllocationDelaySetEntity` | `handleAllocationDelaySet` |
| `EncumberedMagnitudeUpdatedEntity` | `handleEncumberedMagnitudeUpdated` |
| `MaxMagnitudeUpdatedEntity` | `handleMaxMagnitudeUpdated` |
| `OperatorSetCreatedEntity` | `handleOperatorSetCreated` |
| `OperatorAddedEntity` | `handleOperatorAddedToOperatorSet` |
| `OperatorRemovedEntity` | `handleOperatorRemovedFromOperatorSet` |
| `StrategyOperatorSetEvent` | `handleStrategyAddedToOperatorSet`, `handleStrategyRemovedFromOperatorSet` |
| `AVSMetadataUpdate` | `handleAVSMetadataURIUpdated` |
| `RedistributionAddressSetEntity` | `handleRedistributionAddressSet` |
| `AVSRegistrarSetEntity` | `handleAVSRegistrarSet` |

### Rewards Coordinator

| Counter ID | Source Handler |
|---|---|
| `RewardsSubmission` | `handleAVSRewardsSubmissionCreated`, `handleRewardsSubmissionForAllCreated`, `handleRewardsSubmissionForAllEarnersCreated` |
| `OperatorDirectedAVSRewardsSubmission` | `handleOperatorDirectedAVSRewardsSubmissionCreated` |
| `OperatorDirectedOperatorSetRewardsSubmission` | `handleOperatorDirectedOperatorSetRewardsSubmissionCreated` |
| `OperatorAVSSplitBipsSetEntity` | `handleOperatorAVSSplitBipsSet` |
| `OperatorPISplitBipsSetEntity` | `handleOperatorPISplitBipsSet` |
| `OperatorSetSplitBipsSetEntity` | `handleOperatorSetSplitBipsSet` |
| `DistributionRootSubmittedEntity` | `handleDistributionRootSubmitted` |
| `DistributionRootDisabledEntity` | `handleDistributionRootDisabled` |
| `RewardsClaimedEntity` | `handleRewardsClaimed` |
| `RewardsUpdaterSetEntity` | `handleRewardsUpdaterSet` |
| `RewardsForAllSubmitterSetEntity` | `handleRewardsForAllSubmitterSet` |
| `ActivationDelaySetEntity` | `handleActivationDelaySet` |
| `DefaultOperatorSplitBipsSetEntity` | `handleDefaultOperatorSplitBipsSet` |
| `ClaimerForSetEntity` | `handleClaimerForSet` |

### Strategy Manager

| Counter ID | Source Handler |
|---|---|
| `Deposit` | `handleDeposit` |
| `StrategyWhitelisterChangedEntity` | `handleStrategyWhitelisterChanged` |
| `StrategyWhitelistEvent` | `handleStrategyAddedToDepositWhitelist`, `handleStrategyRemovedFromDepositWhitelist` |
| `BurnOrRedistributableSharesIncreasedEntity` | `handleBurnOrRedistributableSharesIncreased` |
| `BurnOrRedistributableSharesDecreasedEntity` | `handleBurnOrRedistributableSharesDecreased` |
| `BurnableSharesDecreasedEntity` | `handleBurnableSharesDecreased` |

### EigenPod Manager

| Counter ID | Source Handler |
|---|---|
| `PodDeployed` | `handlePodDeployed` |
| `BeaconChainDeposit` | `handleBeaconChainETHDeposited` |
| `PodSharesUpdate` | `handlePodSharesUpdated`, `handleNewTotalShares` |
| `BeaconChainETHWithdrawalCompletedEntity` | `handleBeaconChainETHWithdrawalCompleted` |
| `BeaconChainWithdrawal` | `handleBeaconChainETHWithdrawalCompleted` |
| `BeaconChainSlashingEvent` | `handleBeaconChainSlashingFactorDecreased` |
| `BurnableETHSharesIncreasedEntity` | `handleBurnableETHSharesIncreased` |
| `PectraForkTimestampSetEntity` | `handlePectraForkTimestampSet` |
| `ProofTimestampSetterSetEntity` | `handleProofTimestampSetterSet` |

### AVS Directory

| Counter ID | Source Handler |
|---|---|
| `OperatorAVSRegistrationStatusUpdated` | `handleOperatorAVSRegistrationStatusUpdated` |

### Strategy (Template)

| Counter ID | Source Handler |
|---|---|
| `Strategy` | `handleStrategyTokenSet` |

## Usage: Pipeline Completeness Tracking

The primary use case is detecting gaps between what the subgraph has indexed and what a downstream consumer (e.g. a Dagster pipeline) has processed.

### Recommended Approach

1. Query the event counters and `_meta` block number from the subgraph.
2. Compare each counter's `count` against the number of records your pipeline has ingested for that entity type.
3. If there's a mismatch, backfill the missing records.

### Example: Python (Dagster / Generic)

```python
import requests

SUBGRAPH_URL = "http://localhost:8000/subgraphs/name/eigenwatch-ethereum"

def get_subgraph_counts():
    query = """
    {
      eventCounters {
        id
        count
        lastUpdatedBlock
      }
      _meta {
        block { number }
      }
    }
    """
    response = requests.post(SUBGRAPH_URL, json={"query": query})
    data = response.json()["data"]

    counters = {c["id"]: int(c["count"]) for c in data["eventCounters"]}
    head_block = data["_meta"]["block"]["number"]

    return counters, head_block

def check_completeness(pipeline_counts: dict):
    """
    pipeline_counts: {"Deposit": 1523, "OperatorShareEvent": 4821, ...}
    """
    subgraph_counts, head_block = get_subgraph_counts()

    gaps = {}
    for entity_type, expected in subgraph_counts.items():
        actual = pipeline_counts.get(entity_type, 0)
        if actual < expected:
            gaps[entity_type] = {"expected": expected, "actual": actual, "missing": expected - actual}

    return gaps
```

### Example: TypeScript (Frontend)

```typescript
const SUBGRAPH_URL = "http://localhost:8000/subgraphs/name/eigenwatch-ethereum";

interface EventCounter {
  id: string;
  count: string;
  lastUpdatedBlock: string;
  lastUpdatedTimestamp: string;
}

async function getEventCounters(): Promise<EventCounter[]> {
  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{
        eventCounters {
          id
          count
          lastUpdatedBlock
          lastUpdatedTimestamp
        }
      }`,
    }),
  });

  const { data } = await response.json();
  return data.eventCounters;
}
```

## Notes

- Counters are shared across handlers that create the same entity type. For example, `StakerDelegationEvent` is incremented by `handleStakerDelegated`, `handleStakerUndelegated`, and `handleStakerForceUndelegated`. The count reflects the total number of `StakerDelegationEvent` entities in the subgraph regardless of which handler created them.
- `lastUpdatedBlock` and `lastUpdatedTimestamp` reflect the most recent event for that type, not the subgraph's sync head. Use `_meta.block.number` for the overall sync position.
- Counters start from zero when the subgraph is first deployed. If you redeploy from scratch, counters reset.
