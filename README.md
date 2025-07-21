# EigenWatch Subgraph

> 🔍 **Real-time indexing of EigenLayer events for risk analysis and operator monitoring**

**EigenWatch Subgraph** powers the EigenWatch analytics platform by indexing key EigenLayer contracts to enable real-time risk analysis, operator scoring, and delegation monitoring. It captures critical events across the protocol to support restaking infrastructure insights.

[![Deploy Status](https://img.shields.io/badge/deploy-studio-blue)](https://thegraph.com/studio/subgraph/eigenwatch-ethereum/)
[![Network](https://img.shields.io/badge/network-ethereum_mainnet-green)](https://ethereum.org/)

---

## 🚀 What It Does

EigenWatch indexes six core EigenLayer smart contracts to enable:

* **Operator Risk Scoring** – Slashing history, commission behavior, AVS performance
* **Delegation Monitoring** – Real-time flows, volatility, and concentration
* **Economic Analysis** – Rewards tracking, sustainability signals
* **Portfolio Insights** – AVS exposure, strategy allocation, diversification metrics

---

## 🔧 Tracked Contracts

| Contract           | Description                           | Address (Start Block)      |
| ------------------ | ------------------------------------- | -------------------------- |
| DelegationManager  | Operator registration & delegation    | `0x3905...f37A` (17445563) |
| AllocationManager  | Slashing events & AVS assignments     | `0x948a...bc39` (22218956) |
| RewardsCoordinator | Commission rates & rewards tracking   | `0x7750...adda` (20341793) |
| StrategyManager    | Strategy deposits (stETH, rETH, etc.) | `0x8586...075A` (17445564) |
| AVSDirectory       | Legacy AVS registration               | `0x135d...f5af` (19492759) |
| EigenPodManager    | Native ETH restaking                  | `0x91E6...338` (17445564)  |

---

## 🛠️ Quick Start

### Prerequisites

* Node.js 18+
* [Graph CLI](https://thegraph.com/docs/en/developer/quick-start/)

### Setup & Deploy

```bash
git clone https://github.com/your-org/eigenwatch-subgraph
cd eigenwatch-subgraph
npm install
npm run codegen
npm run build

# Authenticate with Graph Studio
graph auth <YOUR_DEPLOY_KEY>

# Deploy
graph deploy eigenwatch-ethereum
```

---

## 📘 Core Entities

* **Operator** – Delegation history, slashing, commissions, AVS memberships
* **Staker** – Individual delegators and their relationships
* **AVS** – Actively Validated Services with operator sets
* **Strategy** – Restaking tokens (e.g., stETH, rETH)
* **EigenPod** – Native ETH restaking pods
* **Events** – Immutable records for slashing, rewards, delegation, etc.

---

## 📊 Example Queries

### Operator Risk Summary

```graphql
query GetOperatorRisk($id: String!) {
  operator(id: $id) {
    slashingEventCount
    delegatorCount
    commissionEvents {
      newCommissionBips
      blockTimestamp
    }
  }
}
```

### Recent Slashing & Delegation

```graphql
query GetRecentEvents($from: BigInt!) {
  operatorSlasheds(where: { blockTimestamp_gte: $from }) {
    operator { id address }
    description
    blockTimestamp
  }
  stakerDelegationEvents(where: { blockTimestamp_gte: $from }) {
    delegationType
    operator { id }
    staker { id }
    blockTimestamp
  }
}
```

> 🔎 More example queries in [`test-queries/`](test-queries/)

---

## 🧠 Use Cases

* **Operator Monitoring** – Reputation, slashing, commission changes
* **AVS Risk Modeling** – Slashing frequency, operator quality
* **Delegation Analysis** – Flow tracking, HHI-based concentration scoring
* **Portfolio Views** – AVS exposure and strategy allocation per operator

---

## 📈 Performance

* **Real-Time Indexing** – <60s latency
* **Initial Sync** – 2–24 hrs (optimized start blocks)
* **Query Performance** – <2s for most complex queries

---

## 🧩 Development

### Add New Events

1. Update `schema.graphql`
2. Add handler in `subgraph.yaml`
3. Implement logic in `src/`
4. Run:

   ```bash
   npm run codegen
   npm run build
   ```

### Local Deployment (Optional)

```bash
# Start Graph node locally
docker-compose up

# Deploy locally
graph create eigenwatch --node http://127.0.0.1:8020
graph deploy eigenwatch --node http://127.0.0.1:8020 --ipfs http://127.0.0.1:5001
```

---

## 📞 Support & Community

* 📘 Docs: [EigenWatch Docs](https://docs.eigenwatch.xyz)
* 🛠️ Report Issues: [GitHub Issues](../../issues)
* 📊 Playground: [GraphQL Explorer](https://thegraph.com/studio/subgraph/eigenwatch-ethereum/playground)

---

**Built with ❤️ for the EigenLayer ecosystem**
