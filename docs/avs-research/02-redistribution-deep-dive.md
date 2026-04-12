# Redistribution — Deep Dive

## What Redistribution Is

In standard EigenLayer slashing, when an operator is penalized, the slashed funds are **burned** — sent permanently to a well-known dead address (`DEFAULT_BURN_ADDRESS`). The stake is destroyed, not captured.

**Redistribution** is a different mode: when an operator is slashed by a *redistributing* operator set, the slashed funds are **sent to a designated recipient address** instead of being burned. The AVS controls who receives those funds at the time the operator set is created.

This distinction is fundamental. It changes what slashing means economically for everyone involved.

---

## How It Works — The Full Event Flow

### Step 1: AVS Creates a Redistributing Operator Set

An AVS calls `createRedistributingOperatorSets(operatorSetIds, redistributionRecipients)`.

**Events emitted:**
- `OperatorSetCreated(OperatorSet operatorSet)` — the operator set exists
- `RedistributionAddressSet(OperatorSet operatorSet, address redistributionRecipient)` — the recipient address is bound to this set

This is permanent. The redistribution recipient **cannot be changed** after creation. If `redistributionRecipient == address(0)`, the set falls back to burning (this is the non-redistributing path). The recipient also cannot be the burn address itself (enforced since the July 2025 audit fix).

**Constraint:** Redistributing operator sets cannot include the `BEACONCHAIN_ETH_STRAT`. Native ETH restaking does not support redistribution. Only LST (liquid staking token) strategies qualify.

### Step 2: Operator Joins and Allocates

Standard flow: `OperatorAddedToOperatorSet`, allocation via `AllocationUpdated`. Nothing redistribution-specific here.

### Step 3: Slash Occurs

An AVS calls `slashOperator(slashParams)`.

**Events emitted:**
```
AllocationManager:
  OperatorSlashed(operator, operatorSet, strategies[], wadSlashed[], description)
  AllocationUpdated(operator, operatorSet, strategy, newMagnitude, effectBlock)   ← per strategy
  EncumberedMagnitudeUpdated(operator, strategy, newEncumberedMagnitude)          ← per strategy
  MaxMagnitudeUpdated(operator, strategy, newMaxMagnitude)                        ← per strategy

StrategyManager:
  BurnOrRedistributableSharesIncreased(operatorSet, slashId, strategy, shares)   ← per strategy

DelegationManager:
  OperatorSharesDecreased(operator, staker, strategy, shares)                    ← per staker
  OperatorSharesSlashed(operator, strategy, shares)
```

The `slashId` is an auto-incrementing counter scoped per operator set. It links `OperatorSlashed` to `BurnOrRedistributableSharesIncreased` — both events reference the same slash event by `(operatorSet, slashId)`.

At this point, the shares are **frozen but not yet sent anywhere**. They are marked as pending redistribution/burn.

### Step 4: Settlement — Funds Actually Move

Someone calls `clearBurnOrRedistributableShares(operatorSet, slashId)` on the StrategyManager. This is permissionless — anyone can trigger it.

**Events emitted:**
```
StrategyManager:
  BurnOrRedistributableSharesDecreased(operatorSet, slashId, strategy, shares)   ← per strategy
```

At this point the actual token transfer happens:
- **Redistributing set:** tokens transferred to `redistributionRecipient`
- **Non-redistributing set:** tokens transferred to `DEFAULT_BURN_ADDRESS`

The same function handles both paths — the difference is determined by whether `isRedistributing` is true for the operator set.

---

## The SlashEscrow Removal (July 2025, PR #1461)

### What SlashEscrow Was

Before this change, when step 4 happened for a redistributing operator set, funds did not go directly to the recipient. Instead they went into a `SlashEscrow` contract, which held them for a **delay period** before the recipient could claim.

The escrow flow had its own events:
- `StartEscrow(operatorSet, slashId, strategy, startBlock)` — funds entered escrow
- `EscrowComplete(operatorSet, slashId, strategy, recipient)` — funds released after delay
- `EscrowPaused / EscrowUnpaused` — protocol-level emergency controls
- `GlobalEscrowDelaySet / StrategyEscrowDelaySet` — configurable delay parameters

### Why It Was Removed

The delay was a safety mechanism: if a slash was fraudulent or erroneous, the escrow window gave time for governance to intervene. However, after a Certora audit, the design was reconsidered. The `refactor: remove redistribution delay` commit (PR #1485) makes this explicit in the commit message.

The conclusion was that the escrow delay added complexity without sufficient security benefit. EigenLayer's slashing is permissioned (only the AVS can slash their own operators), so if a slash is abusive, the recourse is through governance/legal channels, not a time-lock. Requiring a caller to come back after a delay also created operational friction.

### What This Means Now

**If you were tracking SlashEscrow events — stop.** `ISlashEscrow.sol` and `ISlashEscrowFactory.sol` no longer exist in the codebase. Any existing indexing of those events is tracking a removed code path.

The subgraph currently tracks `BurnOrRedistributableSharesIncreased` and `BurnOrRedistributableSharesDecreased` which are the correct events for the current path. This is good — these two events together represent the complete slash settlement lifecycle.

---

## The Legacy Event: `BurnableSharesDecreased`

`IStrategyManager.sol` still emits `BurnableSharesDecreased(IStrategy strategy, uint256 shares)`. The interface comments it explicitly:

> *"This event is only emitted in the pre-redistribution slash path"*

This is for slashes that happened before the redistribution feature was activated on-chain, where the old burn mechanism is still being settled. It is a historical artifact. New slashes do not emit this event — they emit `BurnOrRedistributableSharesDecreased`.

**For the subgraph:** Continue capturing it for completeness (it covers historical settlements), but treat it as a separate legacy category. Don't mix it with `BurnOrRedistributableSharesDecreased` when doing analytics.

---

## The `slashId` — The Key Correlation Field

A detail that is easy to miss: the `slashId` field is critical for correlating events across contracts.

When you see `OperatorSlashed` in AllocationManager, it returns a `slashId`. The same `slashId` appears in:
- `BurnOrRedistributableSharesIncreased` — shares queued for this slash
- `BurnOrRedistributableSharesDecreased` — shares settled for this slash

This three-event chain: `OperatorSlashed → BurnOrRedistributableSharesIncreased → BurnOrRedistributableSharesDecreased` is the complete lifecycle of a single slash event.

Currently the subgraph captures all three, but there is no explicit entity linking them together. To reconstruct the full lifecycle, you must query by `(operatorSet.avs, operatorSet.id, slashId)` across all three event types. Worth considering whether a `SlashLifecycle` aggregate entity would be useful for the AVS dashboard.

---

## Implications by Audience

### Operators

For operators, redistribution changes the *nature* of the slashing risk, not the magnitude. Whether funds are burned or redistributed, the operator loses the same amount of stake. The economic damage to the operator is identical.

What redistribution changes is: **who benefits from that slash.** In a redistributing operator set, the AVS (or its designated treasury, insurance contract, etc.) receives real assets from the slash. This creates a different incentive structure than burning — an AVS running a redistributing set has a financial incentive to find reasons to slash their operators.

This is not necessarily malicious. Redistribution is designed to enable insurance pools, security bonds, and SLA enforcement systems. But it is a risk factor operators should evaluate. **An operator joining a redistributing operator set is implicitly accepting that its stake could be confiscated by the AVS and transferred to a third party.**

**Key questions for an operator evaluating a redistributing AVS:**
- Who is the `redistributionRecipient`? Is it a transparent multisig, a smart contract with a known purpose, or an unknown EOA?
- Has this AVS ever slashed an operator on this operator set? What was the reason (the `description` field in `OperatorSlashed`)?
- How much has been redistributed historically (`BurnOrRedistributableSharesDecreased` sum)?

### Delegators

Delegators are downstream victims in both burn and redistribution scenarios. Their delegated stake is reduced proportionally when their operator is slashed, regardless of whether funds are burned or redirected.

The practical difference for delegators is indirect: redistributing operator sets potentially attract more aggressive slashing behavior. A delegator choosing an operator should be aware of which redistributing sets that operator is in, because those represent the highest-risk slash exposure.

**The dashboard should flag:** "This operator is in X redistributing operator sets. Slashing on these sets transfers your stake to external recipients."

### Agents

For autonomous agents evaluating restaking positions, redistribution is a distinct risk factor that should be modeled separately from burn-slash risk. Key signals:

- **Slash-to-redistribution ratio:** For an operator set, what fraction of total slashed value was redistributed vs burned? An operator set that never slashes is low risk regardless of type.
- **Recipient address analysis:** Is the `redistributionRecipient` a known, audited contract or an unverified EOA? Onchain analysis of the recipient can distinguish legitimate insurance pools from opaque beneficiaries.
- **Slash description text:** The `description` field in `OperatorSlashed` is free-form text the AVS provides. It is indexable and may contain structured justification.
- **Time-to-settlement:** How quickly does `clearBurnOrRedistributableShares` get called after `OperatorSlashed`? Fast settlement could indicate an automated caller (AVS infrastructure) vs slow settlement indicating less active ops.

---

## What the Subgraph Correctly Captures

The current subgraph has good coverage of redistribution events:

- `RedistributionAddressSet` — identifies redistributing operator sets and their recipients
- `OperatorSlashed` — the slash event with strategies, magnitudes, and description
- `BurnOrRedistributableSharesIncreased` — shares frozen (slashId linkage)
- `BurnOrRedistributableSharesDecreased` — shares settled (slashId linkage)
- `BurnableSharesDecreased` — legacy burn path

**One gap:** There is no derived entity linking `OperatorSlashed` to the corresponding `BurnOrRedistributableSharesIncreased/Decreased` events. The `slashId` is captured in the share events, but the slash itself (which lives in AllocationManager) is indexed in a separate entity. Cross-contract correlation must currently be done at query time by matching `(avs, operatorSetId, slashId)` across entities.
