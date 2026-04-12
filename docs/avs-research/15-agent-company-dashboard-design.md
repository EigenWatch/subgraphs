# Agent Company Dashboard — Tying the Agent to Its Underlying Accountability

## What This Dashboard Would Show

An agent company dashboard is a profile page for a specific AVS that is known or suspected to be running autonomous agent services. The goal is to let a user — an operator considering joining, a person considering interacting with the agent's services, a fund evaluating an agent token — assess:

1. **What the agent is supposed to do** (identity and metadata)
2. **Who is backing it** (operators and their history)
3. **What happens if it fails** (redistribution / insurance configuration)
4. **What code it is running** (release history)
5. **Its track record** (slashing history, reward activity, governance stability)

This is essentially the AVS profile you're already building, with agent-specific framing and emphasis on the insurance and code commitment dimensions.

---

## Data Sources for Each Section

### 1. Identity and Metadata

**Source:** `AVSMetadataURIUpdated` (AllocationManager), `MetadataURIPublished` (ReleaseManager)

Show:
- AVS address (the on-chain identity)
- Metadata URI — link to off-chain documentation
- Per-operator-set metadata URI (from ReleaseManager) — the agent's own description of what each set does
- First seen block (when did this AVS first create an operator set — effectively its "birth")
- Governance controller (from PermissionController — who is the admin today?)

Honest limitation: the metadata URI is off-chain. EigenLayer does not verify its content. Display it as a link, not as ground truth.

### 2. Operator Set Composition and Backing

**Source:** `OperatorSetCreated`, `OperatorAddedToOperatorSet`, `OperatorRemovedFromOperatorSet`, `StrategyAddedToOperatorSet`, `AllocationUpdated`, `MaxMagnitudeUpdated`

Show:
- How many operator sets does this AVS have?
- How many operators are currently in each set?
- Which strategies are accepted (which restaked assets back this agent's security)?
- Total stake weight per operator set (sum of operator allocations)
- Is the set redistributing or burning? (from `RedistributionAddressSet`)
- Operator set age and membership stability (churn rate)

Key signal: an agent company backed by a large, stable operator set with deep restaked capital is meaningfully more accountable than one with a small or recently-assembled set.

### 3. Insurance / Redistribution Configuration

**Source:** `RedistributionAddressSet`

This is the most important section for users asking "will I be compensated if this agent fails?"

Show:
- For each operator set: is it redistributing or burning?
- If redistributing: the recipient address
- Is the recipient address an EOA or a contract? (determine via on-chain check)
- Total historical value redistributed (sum of `BurnOrRedistributableSharesDecreased` for redistributing sets)
- Number of slashes that triggered redistribution

**Include a clear warning:** "EigenLayer routes slashed funds to this address but does not enforce how the funds are used. Review the recipient contract to understand whether compensation is available to affected users."

If the recipient address is a known contract (e.g., a verified insurance pool or an audited compensation contract), flag that prominently. If it is an EOA, flag that too. If it is unverified, say so.

### 4. Software / Code Commitment

**Source:** `ReleasePublished`, `MetadataURIPublished` (ReleaseManager), `KeyRegistered`, `OperatorSetConfigured` (KeyRegistrar)

Show:
- Latest release per operator set: artifact digest, registry URL, `upgradeByTime`
- Is the `upgradeByTime` in the past? (suggests pending upgrade or deadline missed)
- Number of releases historically — release cadence
- Number of artifacts per release — how many components must operators run?
- Cryptographic curve type per operator set (BN254 vs ECDSA)
- Active key count per operator set

Honest limitation: "The digest commits to specific code. EigenCloud's TEE verifies that the code that ran matches the digest. EigenWatch cannot verify what the code does — review published source code or audits from the AVS if available."

### 5. Slashing History

**Source:** `OperatorSlashed`, `BurnOrRedistributableSharesIncreased`, `BurnOrRedistributableSharesDecreased`

Show:
- Total slash count for this AVS (all-time, last 90 days)
- Per slash: operator slashed, operator set, strategies affected, `wadSlashed`, description text, block/timestamp
- For redistributing slashes: did the `clearBurnOrRedistributableShares` call happen? How quickly after the slash?
- Slash descriptions (the free-text `description` field in `OperatorSlashed`) — this is one of the most underappreciated fields. It is the AVS's stated reason for the slash.

The `description` field creates a searchable and auditable record of why slashes happened. An AVS that slashes with transparent, specific descriptions is more trustworthy than one that uses vague or identical boilerplate descriptions for every slash.

### 6. Reward Activity

**Source:** `AVSRewardsSubmissionCreated`, `OperatorDirectedAVSRewardsSubmissionCreated`, `OperatorDirectedOperatorSetRewardsSubmissionCreated`

Show:
- How frequently does this AVS submit rewards?
- What reward tokens are being distributed?
- Directed vs pro-rata split (tells you about reward strategy)
- Time since last reward submission (is this AVS currently active on rewards?)
- Total reward volume over time

This directly answers the user question from earlier: "which AVSs are currently giving rewards?" Show the most recent submission date and the submission cadence.

### 7. Governance History

**Source:** `AdminSet`, `AdminRemoved`, `PendingAdminAdded`, `PendingAdminRemoved`, `AppointeeSet`, `AppointeeRemoved` (PermissionController) — currently not indexed, needs to be added

Show:
- Current admin(s) for this AVS
- Admin change history — any changes in the last 30/90/180 days?
- Active appointees — what permissions have been delegated to which addresses?

A flag: "Governance changed N days ago" is a useful alert. Governance changes close to a slash event, or to a major reward submission, are worth highlighting.

---

## The One-Number Problem

Users who don't want to read a full profile need a summary signal. Some options:

**Option 1: Accountability Score (0-100)**
A composite of:
- Operator set age and stability (long-running, low churn = higher score)
- Slash frequency (fewer slashes = higher score, but also penalise long periods without any stake at risk)
- Redistribution configuration (redistributing with a verified compensation contract = bonus points)
- Reward activity (active reward submissions = signal of legitimate ongoing service)
- Governance stability (no recent admin changes = higher score)

Be transparent about the formula. Don't call it a "risk score" without explaining what it measures.

**Option 2: Simple Status Labels**
- Active / Inactive (last reward submission < 90 days ago)
- Redistributing / Burning (insurance configuration)
- Slashed / Clean (any slashes in last 180 days)
- Stable Governance / Recent Changes (admin change in last 90 days)

This is less powerful but more honest about what the data actually says.

---

## The Dashboard Does Not Solve Everything

Be explicit about what the dashboard cannot tell users:

| Question | Can EigenWatch Answer? |
|----------|----------------------|
| Is this agent doing its job well? | No — only track accountability events, not performance |
| Will I definitely be compensated if the agent fails? | No — depends on recipient contract design, not EigenLayer |
| Is the agent code safe? | No — can show digest and release history, not code behaviour |
| Is the operator complying with software requirements? | No — no on-chain enforcement exists |
| Is this agent malicious? | No — only patterns that look anomalous |

Building user trust means being upfront about these limits. A dashboard that implies certainty where there is none will eventually mislead someone and damage credibility. A dashboard that clearly states what it knows and does not know is more durable.

---

## Prioritised Build Order

To build this dashboard, the indexing work needed is:

| Priority | What to Add | Why |
|----------|-------------|-----|
| 1 | PermissionController data source | Enables governance section |
| 2 | ReleaseManager data source | Enables software section |
| 3 | KeyRegistrar data source | Enables operator key section |
| 4 | Cross-contract slash linkage entity | Enables clean insurance section |
| 5 | Curated agent company registry (off-chain) | Enables "these are agent companies" filter |

The first three are new subgraph data sources. The fourth is a schema improvement. The fifth is an off-chain data enrichment layer — a JSON file or database that maps known agent company AVS addresses to names, descriptions, and tags.
