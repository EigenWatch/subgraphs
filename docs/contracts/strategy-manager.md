# StrategyManager Documentation

**Contract Address**: `0x858646372CC42E1A627fcE94aa7A7033e7CF075A` (Mainnet)
**Start Block**: 17445564
**Source File**: `src/strategy-manager.ts`

## Overview

The `StrategyManager` handles the deposit of assets into strategies (LSTs) and the management of those strategies. It is the entry point for LST restaking.

## Key Entities

### Lookup Entities

- **Strategy**: Represents a specific asset/strategy (e.g., stETH Strategy).
- **Staker**: The user depositing into the strategy.

### Event Entities

- `Deposit`: Records a deposit into a strategy.
- `StrategyWhitelistEvent`: Tracks when a strategy is added or removed from the whitelist.
- `BurnOrRedistributableSharesIncreased`: Records share burning (often due to slashing).

## Mappings

### Deposits

- **`handleDeposit`**: Creates a `Deposit` entity. This is the primary event for tracking LST restaking inflow.

### Strategy Lifecycle

- **`handleStrategyAddedToDepositWhitelist`**: Records that a strategy is now open for deposits. **Crucially, this handler also instantiates the `Strategy` template to begin indexing the new strategy contract.**
- **`handleStrategyRemovedFromDepositWhitelist`**: Records that a strategy is closed for deposits.
- **`handleStrategyWhitelisterChanged`**: Tracks administrative changes to the whitelister.

### Slashing Resolution

When an operator is slashed, shares may be burned or redistributed.

- **`handleBurnOrRedistributableSharesIncreased`**: Tracks the increase in shares to be burned/redistributed.
- **`handleBurnOrRedistributableSharesDecreased`**: Tracks the decrease (resolution) of these shares.
- **`handleBurnableSharesDecreased`**: Tracks the final burning of shares.
