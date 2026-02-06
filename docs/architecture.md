# Architecture & Design Philosophy

## Core Philosophy: Pure Event Capture

The EigenWatch subgraph is built with a **"Pure Event Capture"** philosophy.

### Why?

EigenLayer is a complex protocol with frequent state changes (shares, delegations, slashes). For risk analysis and auditing, knowing the _current_ state is not enough; we need to know _how_ we got there.

### Design Principles

1.  **Immutable Events**: The vast majority of entities in `schema.graphql` are immutable (`@entity(immutable: true)`). They represent a specific event that happened at a specific block.
2.  **Minimal Lookup Entities**: Mutable entities (like `Operator`, `Staker`, `AVS`) are kept minimal. They primarily serve as "anchors" to link related events together using GraphQL `@derivedFrom` relationships. They do **not** store complex state like "current total shares" or "current delegate".
3.  **Raw Fidelity**: Event entities map 1:1 with the on-chain events. We avoid heavy transformation logic in the handlers to ensure the subgraph data faithfully represents the on-chain history.

### 4. Hybrid State (The Exception)

While we prioritize immutable events, certain use cases (like TVS calculation) require efficient access to the _current_ state. For these specific cases, we introduce mutable entities (e.g., `OperatorStrategyShare`) that maintain running totals. These are always accompanied by a complete history of immutable events (`OperatorShareEvent`) to preserve auditability.

## Data Model

### 1. Base Event Interface

All event entities implement the `BaseEvent` interface to ensure consistent metadata:

```graphql
interface BaseEvent {
  id: ID! # Unique ID (usually txHash-logIndex)
  transactionHash: Bytes!
  logIndex: BigInt!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  contractAddress: Bytes!
}
```

### 2. Lookup Entities (The Anchors)

These entities exist to allow queries like "Get all slashing events for Operator X".

- **Operator**: Represents an EigenLayer operator.
- **Staker**: Represents a user who restakes assets.
- **AVS**: Represents an Actively Validated Service.
- **Strategy**: Represents a restaking strategy (asset).
- **OperatorSet**: Represents a group of operators serving an AVS.
- **EigenPod**: Represents a user's native ETH restaking pod.

### 3. Event Entities (The History)

These are the bulk of the schema. Examples include:

- `OperatorSharesSlashed`
- `Deposit`
- `WithdrawalEvent`
- `RewardsSubmission`

## Data Flow

1.  **Blockchain Event**: A smart contract emits an event (e.g., `Deposit`).
2.  **Graph Node Ingestion**: The Graph Node detects the event based on `subgraph.yaml`.
3.  **Mapping Handler**: The corresponding function in `src/` is called (e.g., `handleDeposit`).
4.  **Entity Creation**:
    - The handler ensures the "Anchor" entities (Staker, Strategy) exist.
    - The handler creates a new immutable `Deposit` entity with all event parameters.
5.  **Storage**: The entities are saved to the subgraph database.

## Advantages for Risk Analysis

This architecture is specifically tailored for the EigenWatch risk engine:

- **Time-Travel**: You can reconstruct the state of the system at _any_ block height by replaying events up to that block.
- **Auditability**: Every data point can be traced back to a specific transaction hash.
- **Performance**: Writing immutable events is generally faster for the indexer than constantly updating and reading complex mutable entities.
