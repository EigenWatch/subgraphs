# ReleaseManager — Analysis

## What It Is

`ReleaseManager` is a new EigenLayer contract (introduced mid-2025, PR #1469) that allows AVSs to publish versioned software releases per operator set. Think of it as an on-chain software registry: an AVS declares what code their operators are expected to run, with a deadline by which all operators must upgrade.

It is separate from operator registration or stake management. It is purely informational — no staking, slashing, or rewards mechanics are tied to it at the contract level. But the implications for operators and the AVS ecosystem are significant.

---

## The Data Model

A `Release` consists of:

```solidity
struct Release {
    Artifact[] artifacts;
    uint32 upgradeByTime;
}

struct Artifact {
    bytes32 digest;     // hash of the software artifact
    string registry;    // where to fetch it (e.g., Docker Hub, IPFS, OCI registry)
}
```

- `artifacts` is an array — an AVS may require multiple components to be running (e.g., main node + DA client + oracle)
- `digest` is the content hash, providing integrity verification
- `registry` is a URL or identifier for where to pull the artifact
- `upgradeByTime` is a Unix timestamp (uint32) — the deadline for operators to upgrade

**Importantly:** Before an AVS can publish a `Release`, they must first publish a `MetadataURIPublished` event for that operator set. The contract enforces this via a `MustPublishMetadataURI` error. So the metadata URI is effectively the "announcement" that an operator set is actively managed, and releases build on top of that.

---

## Events

### `MetadataURIPublished(OperatorSet indexed operatorSet, string metadataURI)`

Emitted when an AVS publishes or updates the metadata URI for a specific operator set. The URI is expected to point to off-chain structured metadata (JSON or similar) describing the operator set — its purpose, requirements, documentation links, etc.

This is distinct from `AVSMetadataURIUpdated` in AllocationManager, which is AVS-level metadata. `MetadataURIPublished` is scoped to a specific operator set within that AVS.

**Why it matters:** An operator set with a metadata URI is actively managed. An operator set without one may be a legacy or inactive set. For the AVS dashboard, this can serve as a proxy for "is this operator set still live?"

### `ReleasePublished(OperatorSet indexed operatorSet, uint256 indexed releaseId, Release release)`

Emitted when an AVS publishes a new software release. The `releaseId` is sequential (0-indexed), so you can always determine the latest release and version history.

The `Release` struct is emitted inline — you get the full `artifacts[]` array and `upgradeByTime` directly from the event, no additional calls needed.

---

## What You Can Build With This

### Release History per Operator Set

By indexing `ReleasePublished`, you get a complete timeline of every software version an operator set has required. This is immediately useful for:

- **Release cadence:** How often does this AVS push updates? A high release frequency means operational burden for operators. An AVS that releases every week requires a more attentive infrastructure team than one that releases quarterly.
- **Upgrade deadlines:** The `upgradeByTime` field tells you how much time operators were given to upgrade. Short windows are a risk signal — operators with busy infra teams may not be able to comply, potentially leading to penalties if the AVS ever introduces compliance-based slashing.
- **Version age:** How old is the latest release? A release that's been unchanged for a long time might indicate a stable, mature AVS — or one that has gone quiet.

### Operator Compliance Tracking (Future)

The `KeyRegistrar` and `ReleaseManager` together will eventually enable compliance tracking: if an AVS requires release X by time T, and an operator deregistered their key or went offline after T, that is a compliance signal.

Currently there is no on-chain enforcement of `upgradeByTime` — the contract does not slash operators for missing upgrade deadlines. But the data is there for off-chain compliance scoring.

### The `digest` Field

The `digest` is particularly interesting for agents. It is a content hash of the actual artifact. This means:
- Two releases with the same `digest` are running identical software
- An artifact's integrity can be verified by anyone who pulls it
- Unusual or rapidly-changing digests could signal instability

For EigenWatch's eventual agent use case, the `digest` field is a machine-verifiable signal. An agent can verify that the software it's expected to run matches the committed hash.

---

## Implications by Audience

### Operators

This is the most operator-relevant new contract. The core question an operator has when evaluating an AVS is: **"What am I actually being asked to run, and how much operational overhead does this create?"**

Currently, without `ReleaseManager` data in the subgraph, the answer to this question is invisible on-chain. Operators either have to check off-chain documentation or ask the AVS team directly.

With `ReleaseManager` indexed:
- How many software components does each operator set require?
- What is the upgrade frequency and deadline aggressiveness?
- Has the software been stable (few releases) or rapidly changing?
- What is the registry (Docker Hub, IPFS) — does it require pulling large images?

**Dashboard suggestion:** On the AVS operator set detail page, show "Latest Release" with the time since it was published, the `upgradeByTime` deadline (and whether it's already passed), and the number of required artifacts. Add a "Release History" tab showing all past releases.

### Delegators

Less directly relevant. But delegators are indirectly affected if their operator fails to maintain compliance with AVS software requirements, which could eventually lead to forced removal or slashing. Currently this risk is invisible. If EigenWatch adds compliance scoring, delegators could use it to evaluate which operators are keeping up with their AVS commitments.

### Agents

High value. The `ReleaseManager` gives agents structured, verifiable information about what infrastructure they must maintain. Key agent use cases:
- **Automated upgrade alerting:** When a new release is published with `upgradeByTime` within N days, trigger an alert or automated upgrade workflow
- **Compliance verification:** Before accepting delegation to an operator set, verify the node software matches the latest `digest`
- **Risk scoring:** Penalize AVSs with aggressive upgrade cadences in automated risk models

---

## What Needs to Be Added to the Subgraph

The `ReleaseManager` contract address must be added to `subgraph.yaml` as a new data source. Two new entities are needed in `schema.graphql`:

**`OperatorSetMetadataPublished`** (immutable event):
- `operatorSet: OperatorSet!`
- `metadataURI: String!`
- Plus `BaseEvent` fields

**`ReleasePublished`** (immutable event):
- `operatorSet: OperatorSet!`
- `releaseId: BigInt!`
- `upgradeByTime: BigInt!`
- `artifacts: [ReleaseArtifact!]!`
- Plus `BaseEvent` fields

**`ReleaseArtifact`** (nested, non-event):
- `digest: Bytes!`
- `registry: String!`
- `release: ReleasePublished!` (back-reference)

Additionally, the `OperatorSet` lookup entity should gain a derived field pointing to all its releases.

A mutable `LatestRelease` entity per operator set would be useful for efficient "what's the current version" queries without replaying history.
