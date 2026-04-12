# Cross-Chain Architecture — Overview & Future Implications

## Status for EigenWatch

**This is not a near-term priority.** Multichain monitoring is out of scope for the current roadmap. This document exists to:

1. Explain what these new contracts do, so the architecture is understood before it becomes relevant
2. Identify which events are most significant when cross-chain support is eventually added
3. Surface any implications that affect mainnet indexing even before multichain work begins

---

## The Problem Being Solved

EigenLayer's core contracts live on Ethereum mainnet. But the AVSs built on top of EigenLayer often need to verify operator signatures and stake weights on **other chains** — L2s, sidechains, app-specific chains.

Without cross-chain infrastructure, an AVS on Arbitrum cannot know which operators have restaked on Ethereum, what their stake weights are, or whether a set of operators reached a signing threshold. They would have to bridge this information manually, which is slow, expensive, and error-prone.

The cross-chain architecture solves this by:
1. Computing operator tables on mainnet (based on registered keys and stake weights)
2. Generating a Merkle root over all operator tables
3. Publishing that root to destination chains with a cryptographic attestation
4. Letting destination chain contracts verify operator signatures against those tables without trusting a centralized bridge

---

## The Contracts

### CrossChainRegistry (`ICrossChainRegistry.sol`)

Lives on mainnet. This is where AVSs **opt in** to cross-chain verification for their operator sets.

An AVS calls `createGenerationReservation(operatorSet)` to say: "I want this operator set's data to be included in the global operator table that gets pushed to other chains."

**Key events:**

| Event | What it records |
|-------|----------------|
| `GenerationReservationCreated(operatorSet)` | AVS opted this operator set into cross-chain generation |
| `GenerationReservationRemoved(operatorSet)` | AVS opted out |
| `OperatorTableCalculatorSet(operatorSet, calculator)` | AVS set the contract that computes their operator table |
| `OperatorSetConfigSet(operatorSet, config)` | AVS set the configuration for how their table is structured |
| `ChainIDAddedToWhitelist(chainID, operatorTableUpdater)` | A new destination chain was approved |
| `ChainIDRemovedFromWhitelist(chainID)` | Destination chain removed |
| `TableUpdateCadenceSet(tableUpdateCadence)` | How often operator tables are pushed to destination chains |

The `OperatorTableCalculator` is a contract the AVS provides that determines operator weights for their table. EigenLayer provides default calculators (BN254-based), but AVSs can customize how they weight their operators.

### OperatorTableUpdater (`IOperatorTableUpdater.sol`)

Lives on mainnet. This is the "publisher" — it reads the `CrossChainRegistry`'s data, generates a Merkle root over all registered operator tables, and publishes it. A set of `generators` (previously called "confirmers") must attest to the root before it's considered valid.

**Key events:**

| Event | What it records |
|-------|----------------|
| `NewGlobalTableRoot(referenceTimestamp, globalTableRoot)` | A new Merkle root covering all operator tables was published |
| `GeneratorUpdated(operatorSet)` | The generator (attestor) for an operator set was updated |
| `GlobalRootConfirmationThresholdUpdated(bps)` | How much stake must confirm a root (basis points) |
| `GlobalRootDisabled(globalTableRoot)` | A root was manually disabled (emergency mechanism) |

The `referenceTimestamp` in `NewGlobalTableRoot` is important: it tells you the point in time at which the table was computed. Operators who joined or left after this timestamp are not reflected until the next root publication.

### Certificate Verifiers (Destination Chain)

`IBN254CertificateVerifier.sol` and `IECDSACertificateVerifier.sol` live on **destination chains**, not mainnet. They receive the operator tables pushed from mainnet and expose a `verifyCertificate` function that AVS contracts call to verify a threshold signature.

The `TableUpdated(operatorSet, referenceTimestamp, ...)` event fires when a destination chain receives a new operator table. This is the moment the destination chain's view of the operator set is updated.

**For EigenWatch:** These events are only relevant if you are indexing destination chains. They are out of scope until multichain support is added.

---

## The Trust Assumption

The cross-chain system is not a trustless bridge. It relies on a set of `generators` that must attest to the Merkle root. The `GlobalRootConfirmationThresholdUpdated` event tells you what stake-weight threshold is required for a root to be accepted. This is a governance parameter — if it's low, a small number of large operators could publish incorrect roots.

The `GlobalRootDisabled` event is an emergency circuit breaker. If a compromised root is published, it can be disabled. The fact that this mechanism exists signals that the system designers anticipated the possibility of malicious or erroneous root submissions.

---

## What This Means for Mainnet AVS Profiling (Today)

Even without indexing cross-chain events, some observations are relevant right now:

### Identifying Cross-Chain AVSs

`GenerationReservationCreated` fires on mainnet. By indexing `CrossChainRegistry`, you can identify which AVSs have opted into cross-chain verification and which of their operator sets are enrolled. This is a useful profile dimension even without going to destination chains.

An AVS with multiple `GenerationReservationCreated` events is operating in a more complex multichain context. Their operators are running a more sophisticated stack.

### Table Update Cadence

`TableUpdateCadenceSet` tells you how often the global operator table is updated. For operators, this affects how quickly their key registrations and stake changes propagate to destination chains. A slow cadence means a new operator might wait a long time before they're recognized on the destination chain.

### The Generator as a Risk Factor

The entities that control `OperatorTableUpdater` (the generators) are a centralization point. If EigenWatch wants to provide a risk profile of the cross-chain system itself, `GeneratorUpdated` and `GlobalRootConfirmationThresholdUpdated` are governance health signals.

---

## When Cross-Chain Support Becomes Worth Building

The trigger for adding cross-chain support to EigenWatch is when:

1. A meaningful number of AVSs have `GenerationReservationCreated` events
2. AVS operators and delegators are asking about cross-chain activity
3. EigenWatch wants to show an AVS's reach (which chains it serves)

At that point, the additional work is:
- Index `CrossChainRegistry` and `OperatorTableUpdater` on mainnet (captures opt-ins and root publications)
- Optionally: spin up separate subgraphs per destination chain to capture `TableUpdated` events

The mainnet portion is the most useful part — knowing which AVSs are cross-chain and how frequently their tables are updated — without needing to index every destination chain.

---

## Events Summary — Priority When Building

When cross-chain support is eventually added, index in this order:

| Priority | Event | Why |
|----------|-------|-----|
| 1 | `GenerationReservationCreated/Removed` | Identifies cross-chain AVSs |
| 2 | `OperatorTableCalculatorSet` | What calculator is used (affects operator weights) |
| 3 | `NewGlobalTableRoot` | Root publication cadence and timestamps |
| 4 | `ChainIDAddedToWhitelist` | Which destination chains the system serves |
| 5 | `TableUpdateCadenceSet` | How often tables refresh |
| 6 | `GlobalRootDisabled` | Emergency events — high signal when they occur |
| 7 | `GlobalRootConfirmationThresholdUpdated` | Governance changes |
| Low | Destination chain events | Only if per-chain AVS activity tracking is needed |
