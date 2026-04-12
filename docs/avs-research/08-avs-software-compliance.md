# AVS Software Compliance — Can You Tell If Operators Have Upgraded?

## Short Answer

**No.** There is zero on-chain enforcement or tracking of whether an operator has upgraded to a new AVS software release. The `ReleaseManager` is a purely informational contract. It does not require operators to acknowledge releases, verify their software version, or prove compliance with any deadline.

This is confirmed in the code:

- `IReleaseManager.sol` — the full interface contains only publishing and querying functions. There is no function to check if a specific operator is on a specific release, no compliance registry, and no upgrade acknowledgement mechanism. ([src/contracts/interfaces/IReleaseManager.sol:51-126](../../../eigenlayer-contracts/src/contracts/interfaces/IReleaseManager.sol))

- `IKeyRegistrar.sol` — the `KeyInfo` struct contains only `isRegistered` and `keyData`. No release digest, no version hash, no compliance metadata. ([src/contracts/interfaces/IKeyRegistrar.sol:61-74](../../../eigenlayer-contracts/src/contracts/interfaces/IKeyRegistrar.sol)) The `registerKey` and `deregisterKey` functions do not check or reference releases.

The `ReleaseManager` and `KeyRegistrar` are completely decoupled at the contract level. Deregistering and re-registering a key does not constitute an upgrade acknowledgement. The `upgradeByTime` deadline in a release has no enforcement mechanism — if an operator misses it, nothing on-chain happens.

---

## What the `digest` Field Actually Is

The `Artifact` struct in `IReleaseManager.sol` defines the digest as:

```solidity
struct Artifact {
    bytes32 digest;  // "The hash digest of the artifact"
    string registry; // "Where the artifact can be found"
}
```

The contract does **not** specify what algorithm produces the digest or what data is being hashed. It is an opaque 32-byte value. In practice, this is expected to be something like an OCI (Docker) image digest (`sha256:...`) or an IPFS content hash, but the contract imposes no standard.

The usefulness of the digest is **external, not internal**. It works like this:

1. AVS publishes `digest = hash(agent_code)` on-chain via `ReleasePublished`
2. The TEE environment that runs EigenCompute pulls the artifact from `registry`
3. The TEE independently computes the hash of what it downloaded
4. If the hash matches `digest`, the TEE knows it is running exactly the committed code
5. The TEE produces a remote attestation that includes this measurement
6. That attestation is verifiable by anyone

So the digest is primarily useful **within the TEE verification chain**, not for EigenWatch on its own. The on-chain record proves what was *committed*. The TEE attestation proves what *ran*. Together they close the loop.

---

## What You CAN Infer Off-Chain (With Caveats)

There is no direct on-chain signal for operator upgrade compliance. But you can build a circumstantial inference by correlating events across contracts:

### Signal 1: Key Re-registration After a Release

If an AVS publishes a release at block `B`, and an operator deregisters and re-registers their key for that operator set shortly after block `B`, this *may* indicate an upgrade cycle. Operators often restart their nodes to upgrade software, and depending on the AVS architecture, this might require key re-registration.

**Caveat:** This correlation is heuristic, not deterministic. Key re-registration has many causes unrelated to software upgrades.

### Signal 2: Aggregate Key Updates (BN254 Sets)

`AggregateBN254KeyUpdated` events fire whenever any operator joins or leaves a BN254 operator set. A cluster of these events after a `ReleasePublished` event — many operators cycling through key registration — is a rough proxy for a software rollout.

**Caveat:** Same limitation. Operator churn has many causes.

### Signal 3: Temporal Gap Between `upgradeByTime` and Activity

If a release has an `upgradeByTime` that has passed, and an operator is still in the operator set with no evidence of any update activity (no key changes, no node downtime visible in off-chain telemetry), that operator may be running stale software. But this is speculative without off-chain data.

---

## What Would Be Needed for Real Compliance Tracking

True operator software compliance tracking would require one or more of:

1. **An on-chain acknowledgement mechanism** — where operators sign a message committing to a specific release digest. This does not exist today.

2. **TEE attestation indexing** — if EigenCompute published TEE attestation commitments to a contract or to EigenDA, you could verify which software artifact each operator is running. This is closer to the actual EigenCompute model but is off-chain or tied to EigenCompute's own infrastructure, not EigenLayer's base contracts.

3. **Off-chain monitoring** — watching operator node endpoints, RPC responses, or attestation telemetry for version identifiers. Out of scope for the subgraph.

---

## Implication for EigenWatch

Index `ReleasePublished` and `MetadataURIPublished` from `ReleaseManager`. You cannot build a "compliance score" from this data alone, but you can build:

- **Release history per operator set** — version timeline, upgrade frequency, typical deadline windows
- **AVS operational profile** — does this AVS push releases frequently? Are deadlines aggressive or generous?
- **Age of current release** — how long since the latest release was published, and is the `upgradeByTime` in the past?

These are useful signals for operators evaluating an AVS, even without operator-specific compliance tracking. They answer "what is this AVS asking of me?" rather than "are other operators complying?"

The compliance gap is honest: state it clearly in the dashboard. "EigenLayer does not enforce software upgrade compliance on-chain. The following represents the AVS's published release history only."
