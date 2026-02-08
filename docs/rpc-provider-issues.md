# RPC Provider Issues

This document tracks issues identified with the upstream RPC provider (thebuidl.xyz gateway) that need to be resolved for reliable subgraph indexing.

---

## Known Issues

### 1. eth_getTransactionReceipt RLP Decoding Error

**Status**: 🟠 Warning (provider-side issue)

When querying `eth_getTransactionReceipt`, the provider returns an internal Nethermind node error:

```
Nethermind.Serialization.Rlp.RlpException: Expected a sequence prefix to be in the range of <192, 255> and got 20
   at Nethermind.Serialization.Rlp.Rlp.ValueDecoderContext.ReadSequenceLength()
   at Nethermind.Serialization.Rlp.ReceiptStorageDecoder.DecodeInternal(...)
   ...
```

**Impact**: Transaction receipt lookups may fail for some transactions. This affects:

- Subgraph event indexing
- Transaction confirmation checks
- Log retrieval for specific transactions

**Resolution Required**: The RPC provider needs to fix their Nethermind node's receipt storage or upgrade their node client.

**Workaround**: Our proxy will fallback to Alchemy/Infura when this error occurs.

---

### 2. Historical Block Data Availability

**Status**: 🟡 Needs Verification

Query for block `0x1` (genesis+1) returned `null`:

```json
{
  "jsonrpc": "2.0",
  "result": null,
  "id": 2
}
```

**Impact**: If this is an archive node limitation, subgraph indexing from early blocks may not work.

**Action Required**: Verify with provider:

1. Is this a full archive node or pruned?
2. From which block is historical data available?
3. Is `eth_getBlockByNumber` with `true` (full transactions) supported for all historical blocks?

---

## Verified Working Endpoints

The following methods have been verified to work correctly:

| Method                          | Status     | Notes                              |
| ------------------------------- | ---------- | ---------------------------------- |
| `eth_blockNumber`               | ✅ Working | Returns current block number       |
| `eth_getBlockByNumber` (latest) | ✅ Working | Returns full block with all fields |
| `eth_chainId`                   | ✅ Working | Returns `0x1` (Ethereum mainnet)   |
| `net_version`                   | ✅ Working | Returns `"1"` (Ethereum mainnet)   |
| `eth_getLogs`                   | ✅ Working | Returns log array                  |
| `eth_call`                      | ✅ Working | Contract calls function            |

---

## Mitigation Strategy

We've implemented a multi-provider RPC proxy with automatic fallback:

1. **Primary**: thebuidl.xyz gateway (with response envelope unwrapping)
2. **Fallback 1**: Alchemy
3. **Fallback 2**: Infura

If any provider fails, the proxy automatically tries the next one.

---

## Provider Contact

- **Gateway URL**: `https://gateway.thebuidl.xyz/query`
- **Date Identified**: 2026-02-08
