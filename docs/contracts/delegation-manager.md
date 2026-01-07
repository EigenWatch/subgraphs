# DelegationManager Documentation

**Contract Address**: `0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A` (Mainnet)
**Start Block**: 17445563
**Source File**: `src/delegation-manager.ts`

## Overview

The `DelegationManager` is the core contract responsible for managing the relationships between Stakers and Operators. It handles operator registration, delegation of stake, and the tracking of operator shares.

## Key Entities

### Lookup Entities

- **Operator**: Created/Updated upon registration.
- **Staker**: Created/Updated upon delegation or share events.

### Event Entities

- `OperatorRegistered`: Records when a new operator registers.
- `StakerDelegationEvent`: Records when a staker delegates to an operator.
- `StakerUndelegated`: Records when a staker undelegates.
- `OperatorShareEvent`: Tracks increases/decreases in operator shares (critical for TVL and voting power calculations).
- `OperatorSharesSlashed`: Records slashing events affecting operator shares.
- `WithdrawalEvent`: Tracks the queuing and completion of withdrawals.

## Mappings

### Operator Lifecycle

- **`handleOperatorRegistered`**: Creates the `Operator` entity and an `OperatorRegistered` event.
- **`handleOperatorMetadataURIUpdated`**: Updates the operator's metadata URI and creates an `OperatorMetadataUpdate` event.

### Delegation

- **`handleStakerDelegated`**: Links a `Staker` to an `Operator` and creates a `StakerDelegationEvent`.
- **`handleStakerUndelegated`**: Records the undelegation.
- **`handleStakerForceUndelegated`**: Handles forced undelegation scenarios.

### Share Tracking

These handlers are critical for maintaining an accurate history of an operator's backing.

- **`handleOperatorSharesIncreased`**: Creates an `OperatorShareEvent` (Type: INCREASED).
- **`handleOperatorSharesDecreased`**: Creates an `OperatorShareEvent` (Type: DECREASED).
- **`handleOperatorSharesSlashed`**: Creates an `OperatorSharesSlashed` event.

### Withdrawals

- **`handleSlashingWithdrawalQueued`**: Creates a `WithdrawalEvent` (Type: QUEUED).
- **`handleSlashingWithdrawalCompleted`**: Creates a `WithdrawalEvent` (Type: COMPLETED).
