# EigenPodManager Documentation

**Contract Address**: `0x91E677b07F7AF907ec9a428aafA9fc14a0d3A338` (Mainnet)
**Start Block**: 17445564
**Source File**: `src/eigen-pod-manager.ts`

## Overview

The `EigenPodManager` handles **Native ETH Restaking**. It manages the deployment of "EigenPods" (contracts that hold a user's validator credentials) and tracks beacon chain events like deposits, withdrawals, and slashing.

## Key Entities

### Lookup Entities

- **EigenPod**: The contract representing a user's native restaking position.
- **Staker**: The owner of the EigenPod.

### Event Entities

- `PodDeployed`: Records the creation of an EigenPod.
- `BeaconChainDeposit`: Records a deposit to the Beacon Chain via an EigenPod.
- `PodSharesUpdated`: Tracks changes in the pod's shares (balance updates).
- `BeaconChainSlashingEvent`: **CRITICAL**. Records when a validator attached to a pod is slashed on the Beacon Chain.
- `BeaconChainWithdrawalCompleted`: Records a completed withdrawal of ETH.

## Mappings

### Pod Lifecycle

- **`handlePodDeployed`**: Creates a new `EigenPod` entity and links it to the `Staker`.

### Beacon Chain Events

- **`handleBeaconChainETHDeposited`**: Records a deposit of 32 ETH (typically) to the Beacon Chain.
- **`handleBeaconChainETHWithdrawalCompleted`**: Records the return of ETH from the Beacon Chain to the execution layer.

### Share Tracking

- **`handlePodSharesUpdated`**: Updates the share balance of the pod. This changes when the pod's balance on the Beacon Chain changes (rewards or penalties).
- **`handleNewTotalShares`**: Updates the global total shares.

### Slashing

- **`handleBeaconChainSlashingFactorDecreased`**: This corresponds to a slashing event on the Beacon Chain that reduces the pod's effective balance.
