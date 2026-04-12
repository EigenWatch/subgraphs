# KeyRegistrar — Analysis

## What It Is

`KeyRegistrar` (introduced mid-2025, PR #1421) is the on-chain registry for cryptographic keys used by operators within specific operator sets. When an AVS operates a BLS-based task system (like aggregating signatures), operators must register a public key for that operator set. The `KeyRegistrar` manages the lifecycle of those keys.

This is infrastructure-level: it underpins how AVSs verify that a quorum of operators signed off on a task. Without registered keys, operators cannot participate in signature aggregation. Without signature aggregation, many AVS task types cannot function.

---

## Curve Types

The registrar supports two cryptographic curve types, configurable per operator set:

- **BN254** — used for BLS (Boneh-Lynn-Shacham) signature aggregation. The standard curve for EigenLayer's signature schemes. Allows cheap on-chain verification of aggregate signatures.
- **ECDSA** — the standard Ethereum elliptic curve. Lower aggregation efficiency than BN254 but easier for operators using standard Ethereum tooling.

An AVS chooses the curve type when it configures the operator set via `KeyRegistrar`. The choice is permanent — it defines what kind of signing keys operators must register.

---

## Events

### `OperatorSetConfigured(OperatorSet operatorSet, CurveType curveType)`

Emitted when an AVS configures an operator set for key registration with a specific curve type.

This is a one-time event per operator set. If you see this event, the operator set is participating in the KeyRegistrar system. If you don't see it, the operator set is not using on-chain key management (which may be fine — some AVS architectures manage keys off-chain or through other contracts).

**For the dashboard:** This is a useful categorization signal. Operator sets with `OperatorSetConfigured` are running more sophisticated on-chain verification. The `curveType` tells you the signature scheme in use.

### `KeyRegistered(OperatorSet operatorSet, address indexed operator, CurveType curveType, bytes pubkey)`

Emitted when an operator registers their public key for an operator set. The `pubkey` bytes encode either:
- A BN254 G1 point (two 32-byte field elements, serialized)
- An ECDSA public key (33-byte compressed or 65-byte uncompressed)

**Important constraint:** Keys are globally unique and permanently banned from reuse. Once a key has been used and then deregistered, that exact key cannot be registered again for any operator set. This prevents identity confusion and replay attacks.

### `KeyDeregistered(OperatorSet operatorSet, address indexed operator, CurveType curveType)`

Emitted when an operator removes their key from an operator set. The key itself is retained in a global registry to prevent reuse.

**Context:** An operator can only deregister their key if they are no longer slashable by that operator set. This means there is an inherent delay between leaving an operator set and being able to deregister keys — the operator must wait out any active slash windows.

### `AggregateBN254KeyUpdated(OperatorSet operatorSet, BN254.G1Point newAggregateKey)`

Only emitted for BN254 operator sets. Whenever any operator registers or deregisters a key, the aggregate BLS key for the entire operator set is recalculated and this event is emitted.

The aggregate key is the sum of all individual operator public keys. In BLS schemes, verifying a threshold signature against the aggregate key is how you confirm a quorum signed off on a task without checking each operator individually.

---

## What You Can Build With This

### Operator Set Signing Power

By tracking `KeyRegistered` and `KeyDeregistered`, you know at any point how many operators have active keys in a given operator set. Combined with the `AggregateBN254KeyUpdated` event, you can track changes in the signing capacity of an operator set over time.

**Key metrics:**
- Active key count: `KeyRegistered.count - KeyDeregistered.count` per operator set
- Key coverage: what fraction of operators in the set have registered keys? An operator set where many members haven't registered keys is not fully operational
- Aggregate key stability: how frequently does `AggregateBN254KeyUpdated` fire? Frequent changes indicate operator churn

### Operator Key Hygiene

Individual operator analysis:
- How many operator sets does this operator have active keys in?
- Have they ever failed to register a key after joining an operator set?
- Are there operator sets they left without deregistering their key (which would indicate they're still slashable)?

The last point is particularly interesting for risk. If an operator left an operator set but still has an active key there, they may still be exposed to slashing obligations.

### Detecting Inactive Operator Sets

An operator set that has `OperatorAddedToOperatorSet` events but no `KeyRegistered` events is potentially non-functional — operators joined but never registered cryptographic keys, meaning the set cannot produce valid signatures. This could mean:
- The AVS is in setup/onboarding phase
- The AVS does not use KeyRegistrar for their signing scheme
- Something went wrong with operator onboarding

---

## Implications by Audience

### Operators

Key registration is an operational step that an operator must take when joining a KeyRegistrar-configured operator set. It is not automatic. An operator that joins an operator set without registering a key is in the set but cannot fulfill the AVS's tasks — they may miss rewards or trigger penalty mechanisms.

**For the dashboard:** When displaying an operator's membership in an AVS operator set, flag whether they have an active key registered. A membership without a key is a potential compliance gap.

The `CurveType` also matters for operators: BN254 requires running BLS key management tooling. ECDSA is simpler — it's just an Ethereum signing key. The choice of curve affects what infrastructure an operator must run.

### Delegators

Less directly visible. But an operator that hasn't registered keys in their operator sets is not doing its job. If EigenWatch's risk scoring includes AVS engagement metrics, key registration status is one measure of whether an operator is actively participating.

There's also a subtler risk: if an operator can't deregister their key (because they're still slashable), they have ongoing exposure to an operator set they may have already tried to leave. That exposure passes through to delegators.

### Agents

Key registration data is high-value for agents because it is verifiable on-chain:

- **Operational readiness check:** Before delegating to an operator for a given operator set, verify the operator has a registered key
- **Signing power trend:** Monitor `AggregateBN254KeyUpdated` to detect when an operator set's signing power drops suddenly — could indicate mass operator departures ahead of a known problem
- **Stale key detection:** If a key was registered and then the operator left the set (per `OperatorRemovedFromOperatorSet`) but `KeyDeregistered` never fired, flag it as potentially stale/at-risk

The `pubkey` bytes in `KeyRegistered` are also useful for agents building off-chain signature verification — they can cross-reference on-chain key commitments against signatures received off-chain.

---

## Relationship to CrossChainRegistry

`KeyRegistrar` is foundational to the cross-chain architecture. The cross-chain system works like this:

1. Operators register BN254 keys via `KeyRegistrar`
2. The `CrossChainRegistry` computes operator tables using those keys
3. The `OperatorTableUpdater` pushes those tables to destination chains
4. Destination chain `CertificateVerifiers` use the aggregate key to verify signatures

If `KeyRegistrar` events are not indexed, you cannot understand the state of the operator set as it relates to cross-chain verification. This is one more reason to prioritize `KeyRegistrar` indexing alongside cross-chain work when that becomes a priority.

---

## What Needs to Be Added to the Subgraph

The `KeyRegistrar` contract address must be added to `subgraph.yaml`.

**`OperatorSetKeyConfig`** (mutable — tracks current configuration):
- `operatorSet: OperatorSet!`
- `curveType: CurveType!`
- `activeKeyCount: BigInt!` (derived, updated on register/deregister)
- `lastAggregateKeyUpdate: BigInt` (blockTimestamp of last `AggregateBN254KeyUpdated`)

**`KeyRegistrationEvent`** (immutable event — both register and deregister):
- `operatorSet: OperatorSet!`
- `operator: Operator!`
- `curveType: CurveType!`
- `pubkey: Bytes` (null on deregister)
- `eventType: KeyEventType!` (enum: REGISTERED, DEREGISTERED)
- Plus `BaseEvent` fields

**`AggregateBN254KeyUpdate`** (immutable event):
- `operatorSet: OperatorSet!`
- `newAggregateKey: Bytes!` (serialized BN254 G1Point)
- Plus `BaseEvent` fields
