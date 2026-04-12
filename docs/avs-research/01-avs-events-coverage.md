# AVS Events — Current Coverage & Gaps

## What We Currently Index

The subgraph already captures a solid core of AVS-relevant events. Here is what we have, grouped by concern:

### AVS Identity & Configuration (AllocationManager)

| Event | Handler | Covered? |
|-------|---------|----------|
| `OperatorSetCreated` | `handleOperatorSetCreated` | ✅ |
| `AVSMetadataURIUpdated` | `handleAVSMetadataURIUpdated` | ✅ |
| `AVSRegistrarSet` | `handleAVSRegistrarSet` | ✅ |
| `RedistributionAddressSet` | `handleRedistributionAddressSet` | ✅ |
| `StrategyAddedToOperatorSet` | `handleStrategyAddedToOperatorSet` | ✅ |
| `StrategyRemovedFromOperatorSet` | `handleStrategyRemovedFromOperatorSet` | ✅ |

### Operator Membership (AllocationManager)

| Event | Handler | Covered? |
|-------|---------|----------|
| `OperatorAddedToOperatorSet` | `handleOperatorAddedToOperatorSet` | ✅ |
| `OperatorRemovedFromOperatorSet` | `handleOperatorRemovedFromOperatorSet` | ✅ |

### Slashing (AllocationManager + StrategyManager)

| Event | Handler | Covered? |
|-------|---------|----------|
| `OperatorSlashed` | `handleOperatorSlashed` | ✅ |
| `BurnOrRedistributableSharesIncreased` | `handleBurnOrRedistributableSharesIncreased` | ✅ |
| `BurnOrRedistributableSharesDecreased` | `handleBurnOrRedistributableSharesDecreased` | ✅ |
| `BurnableSharesDecreased` (legacy path) | `handleBurnableSharesDecreased` | ✅ |

### Rewards (RewardsCoordinator)

| Event | Handler | Covered? |
|-------|---------|----------|
| `AVSRewardsSubmissionCreated` | `handleAVSRewardsSubmissionCreated` | ✅ |
| `RewardsSubmissionForAllCreated` | `handleRewardsSubmissionForAllCreated` | ✅ |
| `RewardsSubmissionForAllEarnersCreated` | `handleRewardsSubmissionForAllEarnersCreated` | ✅ |
| `OperatorDirectedAVSRewardsSubmissionCreated` | `handleOperatorDirectedAVSRewardsSubmissionCreated` | ✅ |
| `OperatorDirectedOperatorSetRewardsSubmissionCreated` | `handleOperatorDirectedOperatorSetRewardsSubmissionCreated` | ✅ |
| `OperatorAVSSplitBipsSet` | `handleOperatorAVSSplitBipsSet` | ✅ |
| `OperatorSetSplitBipsSet` | `handleOperatorSetSplitBipsSet` | ✅ |
| `DistributionRootSubmitted` | `handleDistributionRootSubmitted` | ✅ |
| `RewardsClaimed` | `handleRewardsClaimed` | ✅ |

### Legacy Registration (AVSDirectory)

| Event | Handler | Covered? |
|-------|---------|----------|
| `OperatorAVSRegistrationStatusUpdated` | `handleOperatorAVSRegistrationStatusUpdated` | ✅ |

---

## Gaps — Events Not Currently Indexed

### Gap 1: PermissionController (medium priority)

**Contract:** `IPermissionController.sol`  
**Not indexed at all.** No data source in `subgraph.yaml`.

| Event | Significance |
|-------|-------------|
| `AdminSet(account, admin)` | Who controls this AVS? A new admin was accepted |
| `AdminRemoved(account, admin)` | Admin removed from AVS governance |
| `PendingAdminAdded(account, admin)` | Admin transition in progress — two-step handoff |
| `PendingAdminRemoved(account, admin)` | Pending admin transfer was cancelled |
| `AppointeeSet(account, appointee, target, selector)` | AVS delegated a specific on-chain permission to another address |
| `AppointeeRemoved(account, appointee, target, selector)` | Permission revoked |

**Why this matters for operators:** An AVS's admin controls who can slash and who can manage operator sets. Governance changes — particularly admin transfers to new addresses or multisig changes — are a signal operators should monitor. An AVS that frequently rotates admins, or one that just transferred control to an unknown address, is a higher-risk commitment.

**Why this matters for delegators:** Delegators don't interact with PermissionController directly, but if an AVS admin becomes compromised or transfers control to a malicious actor, operators serving that AVS could be slashed. The blast radius reaches delegators through their chosen operator.

**Why this matters for agents:** Admin control history is a governance risk signal. Agents evaluating AVS trustworthiness should track admin stability, and flag unexpected transfers.

**Implementation note:** The PermissionController contract address needs to be added to `subgraph.yaml`. It is a protocol-level contract, not deployed per-AVS.

---

### Gap 2: ReleaseManager (high priority for AVS profiling)

**Contract:** `IReleaseManager.sol` — new as of mid-2025.  
**Not indexed at all.**

| Event | Significance |
|-------|-------------|
| `MetadataURIPublished(operatorSet, metadataURI)` | AVS published metadata for a specific operator set |
| `ReleasePublished(operatorSet, releaseId, release)` | AVS published a new software release with artifact digests and an `upgradeByTime` deadline |

See [03-release-manager.md](03-release-manager.md) for a full analysis. Summary of why this is high priority:
- Operators need to know what they're expected to run per operator set
- The `upgradeByTime` field enables compliance tracking — how quickly do operators upgrade after a release?
- Artifacts contain `digest` + `registry` — the actual software a node must run
- An AVS that publishes frequent releases with short upgrade windows signals operational burden

---

### Gap 3: KeyRegistrar (high priority for operator set profiling)

**Contract:** `IKeyRegistrar.sol` — new as of mid-2025.  
**Not indexed at all.**

| Event | Significance |
|-------|-------------|
| `OperatorSetConfigured(operatorSet, curveType)` | AVS chose the cryptographic curve for this operator set (BN254 or ECDSA) |
| `KeyRegistered(operatorSet, operator, curveType, pubkey)` | Operator registered a key for this operator set |
| `KeyDeregistered(operatorSet, operator, curveType)` | Operator deregistered their key |
| `AggregateBN254KeyUpdated(operatorSet, newAggregateKey)` | The aggregate BLS key for the operator set changed |

See [04-key-registrar.md](04-key-registrar.md) for a full analysis. Summary:
- Key registration is now a prerequisite for operators to function in an operator set
- The curve type tells you what cryptographic infrastructure the AVS uses
- `AggregateBN254KeyUpdated` fires every time the operator set composition changes — tracking this tells you the real-time signing power of an operator set

---

### Gap 4: Cross-Chain Contracts (low priority for now)

**Contracts:** `ICrossChainRegistry.sol`, `IOperatorTableUpdater.sol`, and certificate verifiers.  
**Not indexed. Not a near-term priority per project direction.**

These are covered in [05-cross-chain-architecture.md](05-cross-chain-architecture.md). They become relevant when EigenWatch wants to show which AVSs have opted into cross-chain verification and which destination chains they serve.

---

## Prioritized Backlog

| Priority | Action | Effort | User Value |
|----------|--------|--------|------------|
| High | Add `ReleaseManager` data source + entities | Medium | Operator compliance tracking, AVS operational profile |
| High | Add `KeyRegistrar` data source + entities | Medium | Operator set cryptographic health, key history |
| Medium | Add `PermissionController` data source + entities | Low | AVS governance risk, admin history |
| Low | Add `CrossChainRegistry` + `OperatorTableUpdater` | High | Multichain AVS reach (defer) |

---

## Coverage Assessment by User Type

### Operators evaluating an AVS

**Well covered:** Slashing history, operator set composition, reward submission frequency, strategy requirements, redistribution flag.

**Gaps:** Who controls the AVS (admin history), what software versions have been published, what cryptographic curve the operator set uses, whether keys from departed operators have been properly deregistered.

A prospective operator asking "what am I signing up for?" currently gets a partial picture. Reward and slashing history is good. Governance and operational requirements are blind spots.

### Delegators evaluating an operator

Delegators care about AVS data only through the lens of their operator's exposure. We currently have good coverage for:
- Which operator sets the operator is in
- Slashing history per operator-set pair
- Reward distributions the operator has received

Gaps don't significantly affect delegator use cases — they're more operator-centric concerns.

### Agents making autonomous restaking decisions

Agents need machine-readable signals. Current coverage is good for economic signals (reward rates, slashing frequency, TVS). The PermissionController gap is significant for governance risk scoring. ReleaseManager and KeyRegistrar gaps affect operational risk scoring.

For agents, the most valuable addition would be PermissionController (governance stability) and ReleaseManager (operational burden and upgrade compliance rate).

---

## The Question: "Which AVSs Are Currently Giving Rewards?"

This was raised as a key user question. The answer is fully answerable with current subgraph data.

An AVS is "currently giving rewards" if it has a `RewardsSubmission` entity (of any type) with a `startTimestamp` and `duration` that covers the current timestamp, OR if it has submitted a `DistributionRoot` recently.

However, "currently giving rewards" is ambiguous in EigenLayer's model:

- **Submission vs Distribution:** An AVS submits a `RewardsSubmission` for a future period. The distribution happens when a `DistributionRoot` is submitted by the rewards updater and then claimed. So an AVS can submit rewards that don't get distributed for days or weeks.
- **Directed vs Pro-rata:** `OperatorDirectedAVSRewardsSubmissionCreated` lets AVSs choose specific operators and amounts. `AVSRewardsSubmissionCreated` distributes pro-rata to all operators by stake weight.

A better framing for the dashboard: **"Reward-active AVSs"** — AVSs with at least one rewards submission in the last N days. This is more honest than "currently giving rewards" because on-chain claims lag behind submissions. The `rewardsCalculationEndTimestamp` on `DistributionRootSubmitted` events is the authoritative timestamp for when a batch of rewards was calculated up to.
