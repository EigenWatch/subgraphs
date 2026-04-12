# Agent Company Structure — Are They AVSs, or Do They Run on Top?

## The Answer: Layers, Not Equivalents

An "agentic company" on EigenCloud is **not itself an AVS** in the traditional sense. It is an application layer built on top of AVS infrastructure. The relationship is:

```
Agent Company (application layer)
    ↓ uses
EigenAI + EigenCompute + EigenDA + EigenVerify (first-party AVS primitives)
    ↓ secured by
Operator sets (validators who have staked and opted in)
    ↓ anchored to
EigenLayer restaking contracts on Ethereum
```

Source: [docs.eigencloud.xyz/eigenlayer/concepts/eigenlayer-overview](https://docs.eigencloud.xyz/eigenlayer/concepts/eigenlayer-overview)

> *"The EigenCloud platform brings all of EigenLayer's third-party Autonomous Verifiable Services (AVSs) and first-party developer primitives, including EigenDA for data, along with two new primitives, EigenVerify for dispute resolution, and EigenCompute for execution, into a unified cloud platform."*

When EigenCloud says an agent has "cryptoeconomic guarantees," it means the agent is running on EigenCompute and EigenAI — which are themselves AVSs with their own operator sets. The agent company inherits their security. The operators backing EigenAI and EigenCompute are the ones actually validated the agent's execution.

---

## But the Line Can Blur

The above describes the current default. But EigenCloud has also stated that agents can themselves become AVSs.

From the elizaOS partnership blog:
> *"elizaOS simplified elizaOS's path toward building Autonomous Verifiable Services (AVSs), where each agent can carry its own cryptoeconomic guarantees."*

Source: [blog.eigencloud.xyz/how-elizaos-built-cryptographically-verifiable-agents/](https://blog.eigencloud.xyz/how-elizaos-built-cryptographically-verifiable-agents/)

This describes a more advanced path where an agent isn't just running on top of EigenCompute but is itself a registered AVS — with its own operator set, its own slashing conditions, its own governance. In this model:

- The agent company creates an AVS with an operator set on AllocationManager
- Operators opt into that operator set specifically
- Those operators run the agent's infrastructure and validate its specific behaviour
- Slashing conditions are defined by the agent company itself

This is the "agentic company" vision fully realised — the agent company IS the AVS and directly controls who validates it and under what conditions.

---

## Two Models, Both Valid

| Model | Structure | Who are the operators | Slashing conditions |
|-------|-----------|----------------------|---------------------|
| **Agent on EigenCompute** | Agent runs on top of EigenAI/EigenCompute AVS infrastructure | Operators who have opted into EigenAI/EigenCompute operator sets | Defined by EigenAI/EigenCompute (incorrect inference, execution fraud) |
| **Agent as its own AVS** | Agent company registers as an AVS, creates operator sets | Operators who specifically opt into the agent AVS | Defined by the agent company — can be domain-specific |

The first model is simpler to deploy. The second model is more powerful — the agent company has full control over its security model and can define custom slashing conditions (e.g., "slash if the agent executes a trade above X size without approval").

The flagship demo, Sovra (autonomous cartoonist), appears to use the first model — it is built with AgentKit on EigenCompute/EigenAI. No indication it has its own independent operator set.

---

## What This Means for On-Chain Identification

Under **Model 1** (agent on EigenCompute):
- The agent company may not have any on-chain footprint in EigenLayer's base contracts
- You would not find an `OperatorSetCreated` event for the agent company
- You can only identify it through EigenCompute's own infrastructure (container digests, deployment records)

Under **Model 2** (agent as AVS):
- The agent company appears as an AVS address in `OperatorSetCreated` events
- Operators appear in `OperatorAddedToOperatorSet` events for that AVS
- Slashing and rewards events are attributable to the agent company's AVS address
- `ReleasePublished` events from `ReleaseManager` would reference the agent's operator sets
- Everything EigenWatch indexes becomes applicable

---

## The Practical Implication for EigenWatch

For Model 1 agents, EigenWatch can provide limited intelligence — only what EigenCompute exposes, which is currently off-chain infrastructure not visible in EigenLayer's base contracts.

For Model 2 agents (agent companies as AVSs), EigenWatch has full visibility via the existing and planned indexing:
- Operator set composition and membership
- Slashing history and redistribution configuration
- Reward submissions and distribution
- Governance via PermissionController
- Software releases via ReleaseManager
- Cryptographic key management via KeyRegistrar

The interesting question for the dashboard: how do you distinguish an "agent company AVS" from a "traditional AVS"? Currently, there is no on-chain label. A bridge and an autonomous trading agent that both register as AVSs look identical in the base contracts.

Potential signals that an AVS is agent-specific:
- `MetadataURIPublished` pointing to documentation that describes the agent
- A `redistributionRecipient` that is a compensation/insurance contract (suggests designed for agent accountability)
- `ReleasePublished` events with artifacts that reference AI model digests in their registry URL patterns
- The curve type in `KeyRegistrar` — ECDSA is cheaper and simpler, which suits many agent architectures

None of these are definitive. The cleanest solution is curation: EigenWatch maintains a tagged registry of known agent company AVS addresses, similar to how Etherscan labels known contracts. This is an off-chain data enrichment layer, not a contract-level distinction.
