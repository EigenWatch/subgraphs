# EigenWatch Subgraph API Documentation

This document describes all available API endpoints for the EigenWatch Subgraph infrastructure.

---

## Base URL

| Environment         | Base URL                          |
| ------------------- | --------------------------------- |
| Production (Domain) | `https://subgraph.eigenwatch.xyz` |
| Production (IP)     | `http://<SERVER_IP>:7000`         |
| Local Development   | `http://localhost:7000`           |

> **Note**: When using a domain, ensure you have a reverse proxy (e.g., Cloudflare, Caddy, Traefik) handling SSL termination and forwarding to port 7000.

---

## Authentication

All protected endpoints require an API key passed via the `X-API-Key` HTTP header.

```
X-API-Key: your_api_key_here
```

| Endpoint        | Auth Required |
| --------------- | ------------- |
| `/health`       | ❌ No         |
| `/subgraphs/*`  | ✅ Yes        |
| `/graphql`      | ✅ Yes        |
| `/prometheus/*` | ✅ Yes        |
| `/rpc-metrics`  | ✅ Yes        |
| `/metrics`      | ✅ Yes        |

---

## Endpoints

### 1. Health Check

Check if the service is running.

```
GET /health
```

**Authentication**: None required

**Response**:

```
ok
```

**Example**:

```bash
curl https://subgraph.eigenwatch.xyz/health
```

---

### 2. GraphQL Query API

Query indexed blockchain data using GraphQL.

```
POST /subgraphs/name/eigenwatch-ethereum
```

**Authentication**: Required (`X-API-Key` header)

**Headers**:

```
Content-Type: application/json
X-API-Key: your_api_key
```

**Request Body**:

```json
{
  "query": "{ ... }",
  "variables": { ... }
}
```

**Example - Get Recent Operators**:

```bash
curl -X POST https://subgraph.eigenwatch.xyz/subgraphs/name/eigenwatch-ethereum \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "query": "{ operators(first: 10, orderBy: createdAt, orderDirection: desc) { id address createdAt } }"
  }'
```

**Response**:

```json
{
  "data": {
    "operators": [
      {
        "id": "0x...",
        "address": "0x...",
        "createdAt": "1707350400"
      }
    ]
  }
}
```

**Rate Limiting**: 100 requests/second per IP, with burst allowance of 50.

---

### 3. Indexing Status API

Check subgraph indexing status and health.

```
POST /graphql
```

**Authentication**: Required (`X-API-Key` header)

**Example - Check Indexing Status**:

```bash
curl -X POST https://subgraph.eigenwatch.xyz/graphql \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "query": "{ indexingStatusForCurrentVersion(subgraphName: \"eigenwatch-ethereum\") { synced health chains { chainHeadBlock { number } latestBlock { number } } } }"
  }'
```

**Response**:

```json
{
  "data": {
    "indexingStatusForCurrentVersion": {
      "synced": true,
      "health": "healthy",
      "chains": [
        {
          "chainHeadBlock": { "number": "19180000" },
          "latestBlock": { "number": "19179950" }
        }
      ]
    }
  }
}
```

---

### 4. Prometheus Metrics API

Access Prometheus for monitoring data (used by Grafana).

```
GET /prometheus/api/v1/query?query=<promql>
GET /prometheus/api/v1/query_range?query=<promql>&start=<timestamp>&end=<timestamp>&step=<duration>
```

**Authentication**: Required (`X-API-Key` header)

**Example - Query Active Provider**:

```bash
curl -H "X-API-Key: your_api_key" \
  "https://subgraph.eigenwatch.xyz/prometheus/api/v1/query?query=rpc_active_provider"
```

**Response**:

```json
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": {},
        "value": [1707350400, "1"]
      }
    ]
  }
}
```

**Available Metrics**:
| Metric | Description |
|--------|-------------|
| `rpc_requests_total` | Total RPC requests by provider/method/status |
| `rpc_request_duration_seconds` | Request latency histogram |
| `rpc_provider_errors_total` | Error count by provider |
| `rpc_fallbacks_total` | Fallback occurrences |
| `rpc_active_provider` | Currently active provider (1=primary) |

---

### 5. RPC Proxy Metrics

Direct access to RPC proxy Prometheus metrics in text format.

```
GET /rpc-metrics
```

**Authentication**: Required (`X-API-Key` header)

**Example**:

```bash
curl -H "X-API-Key: your_api_key" \
  https://subgraph.eigenwatch.xyz/rpc-metrics
```

**Response** (Prometheus text format):

```
# HELP rpc_requests_total Total RPC requests by provider, method, and status
# TYPE rpc_requests_total counter
rpc_requests_total{provider="thebuidl",method="eth_getBlockByNumber",status="success"} 1542
rpc_requests_total{provider="thebuidl",method="eth_getBlockReceipts",status="success"} 1541
...
```

---

### 6. Graph Node Metrics

Raw metrics from the Graph Node.

```
GET /metrics
```

**Authentication**: Required (`X-API-Key` header)

**Example**:

```bash
curl -H "X-API-Key: your_api_key" \
  https://subgraph.eigenwatch.xyz/metrics
```

---

## Error Responses

### 401 Unauthorized

Returned when API key is missing or invalid.

```json
{
  "error": "Unauthorized - Invalid or missing API key"
}
```

### 429 Too Many Requests

Returned when rate limit is exceeded.

```
<html>
<head><title>429 Too Many Requests</title></head>
<body>...</body>
</html>
```

### 502 Bad Gateway

Returned when the backend service is unavailable.

---

## Grafana Configuration

To connect Grafana to this subgraph's Prometheus:

1. **Add Data Source** → Prometheus
2. **URL**: `https://subgraph.eigenwatch.xyz/prometheus`
3. **Custom HTTP Headers**:
   - Header: `X-API-Key`
   - Value: `your_api_key`
4. **Save & Test**

---

## SDK / Client Examples

### JavaScript (fetch)

```javascript
const API_KEY = "your_api_key";
const BASE_URL = "https://subgraph.eigenwatch.xyz";

async function querySubgraph(query, variables = {}) {
  const response = await fetch(
    `${BASE_URL}/subgraphs/name/eigenwatch-ethereum`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const result = await querySubgraph(
  `
  query GetOperators($first: Int!) {
    operators(first: $first) {
      id
      address
    }
  }
`,
  { first: 10 },
);

console.log(result.data.operators);
```

### Python (requests)

```python
import requests

API_KEY = 'your_api_key'
BASE_URL = 'https://subgraph.eigenwatch.xyz'

def query_subgraph(query: str, variables: dict = None):
    response = requests.post(
        f'{BASE_URL}/subgraphs/name/eigenwatch-ethereum',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        json={'query': query, 'variables': variables or {}},
    )
    response.raise_for_status()
    return response.json()

# Usage
result = query_subgraph('''
    query GetOperators($first: Int!) {
        operators(first: $first) {
            id
            address
        }
    }
''', {'first': 10})

print(result['data']['operators'])
```

---

## Support

For issues or questions, contact the EigenWatch team.
