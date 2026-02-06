# AVSDirectory Documentation

**Contract Address**: `0x135dda560e946695d6f155dacafc6f1f25c1f5af` (Mainnet)
**Start Block**: 19492759
**Source File**: `src/avs-directory.ts`

## Overview

The `AVSDirectory` manages the registration of operators to AVSs.

> **Note**: This contract handles the "Legacy" (M2) registration method. Newer AVSs may use the `AllocationManager` (M3) for operator set management.

## Key Entities

### Event Entities

- `OperatorAVSRegistrationStatusUpdated`: Records when an operator registers or deregisters from an AVS.

## Mappings

### Registration

- **`handleOperatorAVSRegistrationStatusUpdated`**: Creates an `OperatorAVSRegistrationStatusUpdated` entity.
  - `status = 1`: Registered
  - `status = 0`: Unregistered

This event is crucial for determining which operators were active for a given AVS at a specific point in time, especially for legacy AVSs.
