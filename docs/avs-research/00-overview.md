# AVS Research — Overview

This folder contains research and analysis for building the EigenWatch AVS dashboard. It covers the events available for AVS profiling, gaps in current subgraph coverage, and deep dives into key protocol mechanics.

## Documents

| File | Topic |
|------|-------|
| [01-avs-events-coverage.md](01-avs-events-coverage.md) | Current subgraph coverage vs gaps — what we capture, what we're missing, and the user value of each |
| [02-redistribution-deep-dive.md](02-redistribution-deep-dive.md) | How redistribution works, the removal of SlashEscrow, and what this means for AVS risk profiling |
| [03-release-manager.md](03-release-manager.md) | The new ReleaseManager contract — software release tracking per operator set |
| [04-key-registrar.md](04-key-registrar.md) | The new KeyRegistrar contract — cryptographic key management for AVS operator sets |
| [05-cross-chain-architecture.md](05-cross-chain-architecture.md) | Cross-chain operator tables — architecture, events, and when this becomes relevant for EigenWatch |
| [06-eigencloud-rebrand-and-agent-economy.md](06-eigencloud-rebrand-and-agent-economy.md) | EigenLayer's rebrand to EigenCloud — what changed, the AI agent direction, and how the existing contracts connect |
| [07-eigenwatch-positioning-in-eigencloud-era.md](07-eigenwatch-positioning-in-eigencloud-era.md) | How EigenWatch fits in the EigenCloud era — positioning, new use cases, gaps that now matter more |
| [08-avs-software-compliance.md](08-avs-software-compliance.md) | Can you tell if operators have upgraded AVS software? What the digest is and what it isn't |
| [09-redistribution-recipient-and-insurance.md](09-redistribution-recipient-and-insurance.md) | Who the redistribution recipient is, how it's set, whether it functions as insurance, and honest limitations |
| [10-cross-chain-operator-tables-explained.md](10-cross-chain-operator-tables-explained.md) | What the cross-chain operator table contains, the operator-vs-AVS distinction, and what EigenWatch can derive |
| [11-agent-validation-mechanics.md](11-agent-validation-mechanics.md) | How operator sets validate agent execution, the optimistic model, and whether bad execution can be reversed |
| [12-llm-determinism-and-tee-verification.md](12-llm-determinism-and-tee-verification.md) | How EigenAI achieves deterministic LLM inference, what the digest proves, and honest technical limits |
| [13-agent-company-structure.md](13-agent-company-structure.md) | Are agent companies AVSs or do they run on top? The two models and how to identify them |
| [14-market-reality-devils-advocate.md](14-market-reality-devils-advocate.md) | Who actually cares, how to sell it, hard truths about the market, and the most viable revenue paths |
| [15-agent-company-dashboard-design.md](15-agent-company-dashboard-design.md) | Dashboard design for agent company profiles — data sources, sections, honest limitations, build order |
| [16-the-accountability-gap.md](16-the-accountability-gap.md) | What cryptoeconomic guarantees for AI actually cover, the oracle vs AI inference risk comparison, and EigenWatch's positioning as the honest translator |

## Framing

Throughout this research, analysis is framed around three audiences who might interact with AVS data:

- **Operators** — Evaluating which AVSs to join. Primary audience for the AVS dashboard. They want to understand risk, reward history, reputation, and what they're signing up for before committing stake.
- **Delegators** — Evaluating which operators to delegate to. Often not EigenLayer-native users. They care indirectly about AVS quality through the operators their stake is exposed to.
- **Agents (future)** — Autonomous systems making restaking decisions through MCP servers. They need structured, high-fidelity data. Signal clarity and anomaly detection matter more than narrative.

Not every event matters equally to every audience. The documents flag which insights are operator-centric, delegator-centric, or agent-optimized where it's non-obvious.

## What Changed Since July 2025

85 commits were merged between July 2025 and April 2026. The most significant additions for AVS profiling are:

- **ReleaseManager** (new contract) — AVSs can now publish versioned software releases per operator set with upgrade deadlines
- **KeyRegistrar** (new contract) — Cryptographic key registration per operator set (BN254 and ECDSA)
- **Redistribution** — `SlashEscrow` was removed entirely. Slashed funds now go directly to the redistribution recipient with no delay
- **Cross-chain architecture** — `CrossChainRegistry`, `OperatorTableUpdater`, `CertificateVerifiers` — the infrastructure for multichain verification

The subgraph has not been updated to cover any of the new contracts.
