# EigenWatch Subgraph Documentation

Welcome to the technical documentation for the EigenWatch Subgraph. This repository contains the subgraph implementation for indexing EigenLayer protocol events on Ethereum Mainnet.

## 📚 Documentation Structure

This documentation is organized as follows:

- **[Architecture](./architecture.md)**: Understand the "Event-Focused" design philosophy and the data model.
- **[Setup & Deployment](./setup.md)**: Instructions for installing dependencies, building, and deploying the subgraph.
- **[Self-Hosted Infrastructure](./self-hosted-infrastructure.md)**: Docker Compose stack, RPC proxy, PostgreSQL configuration, and monitoring endpoints.
- **[Event Counters](./event-counters.md)**: Per-entity-type event counters for pipeline completeness tracking.

### Contract Documentation

Detailed documentation for each mapped EigenLayer contract:

- **[Delegation Manager](./contracts/delegation-manager.md)**: Operator registration, delegation, and share tracking.
- **[Allocation Manager](./contracts/allocation-manager.md)**: Slashing events, operator sets, and AVS allocation logic.
- **[Rewards Coordinator](./contracts/rewards-coordinator.md)**: Rewards submissions, commission rates, and distribution.
- **[Strategy Manager](./contracts/strategy-manager.md)**: Deposits, strategy whitelisting, and share burning.
- **[AVS Directory](./contracts/avs-directory.md)**: Legacy operator-AVS registration.
- **[Eigen Pod Manager](./contracts/eigen-pod-manager.md)**: Native ETH restaking, pod deployment, and beacon chain events.

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Generate types from schema and ABIs
yarn codegen

# Build the subgraph
yarn build
```

See the [Setup Guide](./setup.md) for more details.

## 🔍 Project Overview

EigenWatch is designed to provide a comprehensive, event-level history of the EigenLayer ecosystem. Unlike traditional subgraphs that focus on maintaining current state (e.g., "current balance"), this subgraph focuses on capturing every **state change** as an immutable event.

### Key Features

- **Immutable History**: All major protocol events are stored as immutable entities.
- **Risk Analysis Ready**: Granular data on slashing, withdrawals, and strategy shifts.
- **Multi-Contract Support**: Covers all core EigenLayer contracts including the new AllocationManager and RewardsCoordinator.
