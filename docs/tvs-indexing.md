# TVS Event Indexing Implementation

## Overview

The TVS (Total Value Secured) indexing system is designed to capture all necessary data to calculate the TVS of EigenLayer operators. This includes tracking operator shares per strategy and capturing strategy metadata.

## Key Components

### 1. Running Totals (`OperatorStrategyShare`)

Unlike the "Pure Event Capture" philosophy used elsewhere in this subgraph, TVS calculations require efficient access to the _current_ total shares of an operator for a specific strategy.

- **Entity**: `OperatorStrategyShare`
- **Type**: Mutable
- **Fields**:
  - `operator`: The operator address.
  - `strategy`: The strategy address.
  - `totalShares`: The current running total of shares.
  - `lastUpdatedBlock`: Metadata for tracking updates.

### 2. Strategy Templates

Strategies in EigenLayer are dynamic contracts. To capture events emitted by these contracts (specifically `StrategyTokenSet` and `ExchangeRateEmitted`), we use The Graph's **Data Source Templates**.

- **Template**: `Strategy`
- **Instantiation**: When `StrategyManager` emits `StrategyAddedToDepositWhitelist`, the `Strategy` template is programmatically instantiated for the new strategy address.
- **Events Captured**:
  - `StrategyTokenSet`: Captures the underlying token and decimals.
  - `ExchangeRateEmitted`: Captures exchange rate updates (if applicable).

### 3. Historical Event Tracking

While `OperatorStrategyShare` tracks the _current_ state, we also maintain a complete history of all share changes for auditability.

- **Entity**: `OperatorShareEvent` (Immutable)
- **Event Types**:
  - `INCREASED`: Shares added (delegation/deposit).
  - `DECREASED`: Shares removed (undelegation/withdrawal).
  - `SLASHED`: Shares slashed.

## Data Flow

1. **Share Change**: `DelegationManager` emits `OperatorSharesIncreased/Decreased/Slashed`.
2. **Handler**:
   - Updates `OperatorStrategyShare` (running total).
   - Creates `OperatorShareEvent` (historical record).
3. **Strategy Creation**: `StrategyManager` emits `StrategyAddedToDepositWhitelist`.
4. **Handler**:
   - Creates `Strategy` entity.
   - Spawns `Strategy` template indexer.
5. **Strategy Metadata**: `Strategy` contract emits `StrategyTokenSet`.
6. **Handler**: Updates `Strategy` entity with token details.
