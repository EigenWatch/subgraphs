# LLM Determinism and TEE Verification — The Technical Reality

## Your Concern Is Valid

Researchers and practitioners widely observe that LLMs produce different outputs for identical inputs across different runs, even with temperature set to 0. This is not a misunderstanding — it is a well-documented property of GPU floating-point arithmetic. EigenCloud's claim of deterministic inference is therefore a non-trivial engineering assertion, not a default property of AI systems.

The short answer: **the claim is real, but it comes with significant constraints that matter for understanding what "verifiable AI" actually means in practice.**

---

## Why LLMs Are Not Deterministic By Default

Temperature controls the token selection rule, not the underlying arithmetic. The problem is in the compute layer:

Modern LLMs run on GPUs using libraries like cuBLAS and cuDNN. These libraries use operations like parallel reduction (summing large arrays across many cores simultaneously) and atomic memory writes. These operations are **non-associative** — the order in which threads accumulate partial sums affects the result due to floating-point precision limits. Two runs with the same input can accumulate those sums in a different order and produce slightly different logit values, which compounds through the network to produce different token probabilities.

Even with temperature=0 (greedy decoding, always pick the highest probability token), if the logit values differ by even a tiny amount due to non-deterministic arithmetic, the top token can change.

This is not a bug — it is an inherent property of parallel floating-point computation. Researchers documenting this include work on "numerical non-determinism" in neural network inference.

---

## How EigenAI Achieves Determinism

EigenCloud published the technical approach at [blog.eigencloud.xyz/deterministic-ai-inference-eigenai/](https://blog.eigencloud.xyz/deterministic-ai-inference-eigenai/) and in an arXiv paper ([arxiv.org/abs/2602.00182](https://arxiv.org/abs/2602.00182)).

The approach has four components:

**1. Hardware uniformity.** Operators and verifiers must use **identical GPU hardware models** (e.g., both must run NVIDIA A100, or both H100 — not one of each). Different GPU architectures produce different results for the same operation even with the same software. This is a real constraint: it limits which operators can validate a given agent's work to those with matching hardware.

**2. Custom math kernels.** EigenAI replaces standard GPU library calls with custom implementations that use "warp-synchronous reductions with fixed thread ordering" — meaning threads always accumulate in the same order, eliminating the source of non-determinism. This is applied to the specific operations that cause non-determinism (matrix multiplications, layer normalisation, attention).

**3. Framework optimisation controls.** Modern inference frameworks (PyTorch, llama.cpp) apply dynamic graph optimisations that vary between runs. EigenAI disables these — "turns off dynamic graph fusion" — to ensure the same computational graph runs every time.

**4. Deterministic sampling.** Fixed-seed PRNGs with canonical iteration order for any sampling operations (not applicable at temperature=0, but required for temperature>0 scenarios).

**Result:** "100% match rate on same-architecture runs" across 10,000 test cases, with approximately 1.8% additional inference latency.

Source: [blog.eigencloud.xyz/deterministic-ai-inference-eigenai/](https://blog.eigencloud.xyz/deterministic-ai-inference-eigenai/)

---

## What "Same Input = Same Output" Actually Requires

The determinism guarantee holds only when:
- Same model weights
- Same GPU hardware model (not just same driver/CUDA version — same physical GPU architecture)
- Same EigenAI inference engine version
- Same fixed-seed PRNG state
- EigenAI's custom kernels and disabled optimisations in effect

This is a more constrained environment than "just run the same prompt again." It requires a controlled, standardised execution environment. This is exactly what TEEs (Trusted Execution Environments) provide.

---

## The TEE's Role — Proving What Actually Ran

The TEE (Trusted Execution Environment — hardware like Intel SGX or AMD SEV) is the mechanism that makes the determinism guarantee enforceable:

1. **Container digest verification:** The TEE verifies that the Docker image it is running matches the `digest` registered in `ReleaseManager`. It will not execute code with a different hash.

2. **Remote attestation:** The TEE hardware produces a signed attestation — a cryptographic proof from the hardware itself that says "I ran this specific code, with these specific inputs, on this specific model." This attestation cannot be forged without compromising the TEE hardware at a hardware level.

3. **Binding the claim:** The attestation binds together: the code that ran + the model weights + the hardware configuration + the output. A verifier who re-runs the same computation on identical hardware should get the same output. If they don't, the original attestation is fraudulent.

The verification process from the arXiv paper:
> *"By being able to re-execute a certain inference given prompt X and model Y producing output Z, the re-execution of prompt X using model Y should produce output Z. If it does not, that is the evidence which fully verifies incorrect execution."*

So the digest in `ReleaseManager` is the code-level commitment. The TEE attestation is the runtime verification. Together they answer: "did this agent run the code it said it would, in the environment it committed to, and produce the output it claims?"

---

## What the Digest Is Not

The `digest` field in `ReleaseManager.Artifact` is a hash of the **software artifact** (the Docker image or equivalent). It is:

- **Not** a hash of the model weights (those are separate, though the container may commit to specific model versions)
- **Not** a hash of agent outputs (those are in certificates, not releases)
- **Not** a hash of source code (it's the compiled/containerised artifact)

You cannot read the digest and understand what the agent does. You can only verify that what ran in the TEE is the same artifact that was committed to on-chain. Whether that artifact does something sensible, safe, or intended is not determinable from the digest alone.

Source code transparency is a separate, unsolved problem. If the AVS does not publish their source code, users cannot audit agent behaviour directly. The digest proves consistency, not correctness.

---

## Honest Limitations

**LLM non-determinism research is ongoing.** The EigenAI approach produces 100% match rates in their test environment. "100% match rate across 10,000 tests" is a strong result, but it is under controlled conditions on specific models. As models change, GPU architectures evolve, and inference frameworks update, maintaining this determinism guarantee requires continuous engineering effort.

**Hardware constraint is a real decentralisation tradeoff.** Requiring identical GPU hardware (e.g., all A100s) limits who can participate as verifiers. This is not censorship — it is an engineering reality. But it means the "decentralised verification" is bounded by which hardware configurations the network has standardised on.

**You still cannot audit what the agent is doing.** The TEE + determinism model proves that the agent ran honestly (it ran the committed code and reported the correct output). It does not prove that the committed code is safe, ethical, or aligned with user interests. An agent that consistently and deterministically does something you don't want is still consistently and deterministically doing something you don't want — and EigenCloud's verification layer will confirm every run of it faithfully.

---

## Implications for EigenWatch

EigenWatch cannot audit agent logic from on-chain data. What it can track:

- Which software artifact is committed via `ReleasePublished` (the digest)
- When that artifact changed (release history)
- Whether the same digest has been used across multiple operator sets (reuse implies shared code base)
- How frequently the agent's code changes (high churn could indicate instability or experimentation)

This is useful context even without source code transparency. An agent that has been running the same digest for 6 months is a different risk profile than one that updates weekly. An agent whose digest matches other known, audited agents gives more confidence than a completely novel one.

The honest framing for users: "EigenCloud verifies that operators ran exactly the committed code and reported the correct output. EigenWatch shows you what code was committed and when. Neither system tells you whether the agent is safe or well-designed — that requires reviewing published source code or audits if the AVS provides them."
