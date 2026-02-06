# AllocationManager Documentation

**Contract Address**: `0x948a420b8CC1d6BFd0B6087C2E7c344a2CD0bc39` (Mainnet)
**Start Block**: 22218956
**Source File**: `src/allocation-manager.ts`

## Overview

The `AllocationManager` is a critical contract for risk assessment. It manages **slashing**, **operator sets**, and the allocation of security to AVSs (Actively Validated Services).

## Key Entities

### Lookup Entities

- **OperatorSet**: Represents a group of operators serving an AVS.
- **AVS**: The Actively Validated Service being secured.

### Event Entities

- `OperatorSlashed`: **CRITICAL**. Records when an operator is slashed, including the magnitude and strategies involved.
- `AllocationEvent`: Tracks the allocation of magnitude (security) from an operator to an operator set.
- `OperatorSetCreated`: Records the creation of a new operator set.
- `OperatorAddedToOperatorSet` / `OperatorRemovedFromOperatorSet`: Tracks membership changes in operator sets.

## Mappings

### Slashing

- **`handleOperatorSlashed`**: Captures the `OperatorSlashed` event. This is the most important event for risk modeling as it represents a realized risk.

### Allocation & Magnitude

- **`handleAllocationUpdated`**: Creates an `AllocationEvent` showing how much "magnitude" (security) is allocated.
- **`handleEncumberedMagnitudeUpdated`**: Tracks magnitude that is currently locked/encumbered.
- **`handleMaxMagnitudeUpdated`**: Tracks the maximum magnitude cap.

### Operator Sets

Operator Sets are the mechanism by which AVSs select their security providers.

- **`handleOperatorSetCreated`**: Initializes a new `OperatorSet` entity.
- **`handleOperatorAddedToOperatorSet`**: Records an operator joining a set.
- **`handleOperatorRemovedFromOperatorSet`**: Records an operator leaving a set.

### AVS Metadata

- **`handleAVSMetadataURIUpdated`**: Updates the metadata URI for an AVS entity.
