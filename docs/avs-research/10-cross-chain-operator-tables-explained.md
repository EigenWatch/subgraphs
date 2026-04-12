# Cross-Chain Operator Tables — What They Are and What They Tell You

## The Core Distinction: Operators Are Not Moving

The most important thing to clarify upfront: the cross-chain operator table system is **not about operators doing work on other chains.** Operators stay on Ethereum. Their stake, their keys, their registration — all of that lives on Ethereum mainnet.

What the cross-chain system does is push a **snapshot of the operator set** (who the operators are, what keys they have, how much stake they control) to destination chains, so that contracts on those chains can verify that a group of operators signed off on something — without making a cross-chain call back to Ethereum to look it up.

The distinction matters:
- **"Operators validating on other chains"** → false. Operators sign messages. Those messages might relate to tasks that happen on another chain, but the operators themselves are Ethereum entities.
- **"AVSs offering services on other chains"** → correct. The AVS uses the operator set's signatures to provide guarantees to contracts on other chains. Example: a bridge, an oracle, or an agent running on Arbitrum wants to verify that 2/3 of a staked operator set signed off on a piece of data. The cross-chain table lets it do that without bridging.

---

## What Is Actually In the Operator Table

Code reference: [ICrossChainRegistry.sol:280-292](../../../eigenlayer-contracts/src/contracts/interfaces/ICrossChainRegistry.sol), [IBN254CertificateVerifier.sol:97](../../../eigenlayer-contracts/src/contracts/interfaces/IBN254CertificateVerifier.sol)

For a **BN254 operator set**, the table contains:
- `totalWeights` — total stake weight across all operators
- `operatorInfoTreeRoot` — Merkle root of individual operator info (allows selective verification)
- `aggregatePubkey` — the aggregate BLS public key of all operators in the set
- `numOperators` — total count

For an **ECDSA operator set**, the table is an array of `ECDSAOperatorInfo` — each entry containing the operator's address and their stake weight.

The table is a **point-in-time snapshot** tied to a `referenceTimestamp`. When you see `NewGlobalTableRoot(referenceTimestamp, globalTableRoot)` emitted by the `OperatorTableUpdater`, that timestamp is when the table was computed. Any changes after that timestamp (new operators, departed operators, stake changes) are not reflected until the next update.

---

## The Certificate — What Gets Verified on Destination Chains

A "certificate" is a signed attestation that a group of operators have agreed on something. It is the output of the operator set doing its job.

When an AVS runs a task (say, verifying a cross-chain data request), a quorum of operators sign the result. Those signatures, bundled together, form a certificate. The certificate is then submitted to a contract on the destination chain.

The destination chain's `CertificateVerifier` contract verifies:
1. The certificate references a valid `referenceTimestamp` (the table it was based on is not too stale — enforced by `maxStalenessPeriod`)
2. The operators who signed were actually registered operators at that timestamp
3. The aggregate signature is cryptographically valid
4. The total stake weight of signers meets a threshold (e.g., 2/3 of total stake)

Code reference: [IBN254CertificateVerifier.sol:115-137](../../../eigenlayer-contracts/src/contracts/interfaces/IBN254CertificateVerifier.sol), [IECDSACertificateVerifier.sol:130-133](../../../eigenlayer-contracts/src/contracts/interfaces/IECDSACertificateVerifier.sol)

**This is the entire point of the cross-chain system.** A contract on Arbitrum, Base, Solana (or anywhere) can call `verifyCertificate` and get a cryptographic guarantee that a staked, slashable Ethereum operator set signed off on something. No trust in a bridge operator, no trust in an oracle — just math and economics.

---

## The Full Lifecycle

```
Ethereum Mainnet:
  1. Operators register keys via KeyRegistrar → KeyRegistered events
  2. AVS opts into cross-chain via CrossChainRegistry.createGenerationReservation()
  3. OperatorTableUpdater computes table and publishes → NewGlobalTableRoot event
  4. Table is transported to destination chains

Destination Chain:
  5. CertificateVerifier receives the table → TableUpdated event
  6. Operator set does its work (signs tasks)
  7. Certificate submitted to CertificateVerifier.verifyCertificate()
  8. Verification passes or fails based on signatures + stake weights
  9. If operators misbehave → evidence submitted on mainnet → slash
```

The slash still happens on mainnet (step 9). The destination chain does not slash — it only verifies. The economic accountability lives on Ethereum.

---

## Staleness — A Real Risk

The `maxStalenessPeriod` on the `CertificateVerifier` contract defines how old a table can be before certificates based on it are rejected. If the `OperatorTableUpdater` hasn't updated a table within the staleness window, the operator set becomes unable to produce valid certificates on the destination chain — effectively going offline for that chain.

The `TableUpdateCadenceSet` event on `CrossChainRegistry` records how often the global table is expected to update. If actual updates (`NewGlobalTableRoot`) are less frequent than the configured cadence, that is an operational warning sign.

---

## What This Means for EigenWatch Intelligence

Even without indexing destination chains, indexing the mainnet cross-chain contracts opens up useful intelligence:

### Which AVSs Have Opted In to Cross-Chain
`GenerationReservationCreated(operatorSet)` on `CrossChainRegistry` tells you which AVSs have registered an operator set for cross-chain transport. This is a profile dimension for the AVS dashboard: an AVS with active generation reservations is operating in a multichain context.

### Which Chains Are Supported
`ChainIDAddedToWhitelist(chainID, operatorTableUpdater)` tells you the destination chains the system serves. Combined with which AVSs have reservations, you can infer where specific AVS services are being made available.

### Table Update Frequency
`NewGlobalTableRoot` events give you the cadence of global table publications. A long gap between `NewGlobalTableRoot` events means all cross-chain services relying on that table are operating on stale data — operators who have left may still appear registered, and new operators won't appear yet.

### Staleness Configuration
`MaxStalenessPeriodUpdated(operatorSet, maxStalenessPeriod)` on the `CertificateVerifier` contracts (destination chain) tells you how tight the staleness window is. A short `maxStalenessPeriod` means the AVS requires frequent table updates to stay operational — higher operational risk if the update cadence slips.

### The Gap Between Table Timestamp and Reality
If you know when an operator joined or left (from `OperatorAddedToOperatorSet` / `OperatorRemovedFromOperatorSet` events) and you know the `referenceTimestamp` of the current operator table, you can identify operators whose status has changed but is not yet reflected in the cross-chain table. That gap is a real risk window: on the destination chain, a departed operator is still considered valid for the staleness period.

---

## What You Cannot Know Without Indexing Destination Chains

- Whether certificates are actually being submitted and verified on each chain
- Whether a specific operator set's table is live and functional on a given destination chain
- Whether the `maxStalenessPeriod` is being violated in practice

These require running separate subgraphs on each destination chain (Arbitrum, Base, etc.) indexing the `CertificateVerifier` contracts there. This is the deferred multichain work.

---

## Summary

The cross-chain operator table system answers one question: **"Can contracts on chain X verify that EigenLayer operators signed off on something?"**

It does this by pushing a snapshot of the operator set (keys + stake weights) from mainnet to destination chains, so those chains can verify certificates (aggregate signatures) without calling back to Ethereum.

For EigenWatch:
- Mainnet indexing (`CrossChainRegistry` + `OperatorTableUpdater`) gives you "which AVSs are cross-chain and how fresh is their operator table"
- Destination chain indexing gives you "is the service actually being used and are certificates being verified" — deferred for now
- The staleness risk angle is immediately actionable: a cross-chain AVS whose global table is overdue for an update is operationally degraded on all its destination chains
