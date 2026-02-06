# Self-Hosted Infrastructure

The subgraph has been migrated from The Graph Studio to a self-hosted Graph Node stack. This document covers the infrastructure components, configuration, and available monitoring endpoints.

## Stack Overview

| Service | Purpose | Image / Source |
|---|---|---|
| **graph-node** | Indexes blockchain events, serves GraphQL | `graphprotocol/graph-node` |
| **rpc-proxy** | Injects API key headers, normalizes RPC responses | `./rpc-proxy` (custom Node.js) |
| **ipfs** | Stores subgraph manifests and schemas | `ipfs/kubo:v0.17.0` |
| **postgres** | Stores indexed entity data | External (not in docker-compose) |

## Configuration

All secrets and connection details are configured via environment variables. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|---|---|---|
| `RPC_API_KEY` | API key for the RPC gateway | `your_api_key_here` |
| `RPC_GATEWAY_URL` | RPC endpoint URL (defaults to `https://gateway.thebuidl.xyz/query`) | `https://gateway.thebuidl.xyz/query` |
| `POSTGRES_HOST` | PostgreSQL host reachable from Docker | `host.docker.internal` |
| `POSTGRES_PORT` | PostgreSQL port (defaults to `5432`) | `5432` |
| `POSTGRES_USER` | PostgreSQL user | `graph-node` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `your_password_here` |
| `POSTGRES_DB` | PostgreSQL database name | `graph_node` |

### PostgreSQL Setup

The database must exist before starting graph-node. On your PostgreSQL instance:

```sql
CREATE USER "graph-node" WITH PASSWORD 'your_password_here';
CREATE DATABASE graph_node OWNER "graph-node";
```

The `graph-node` container uses `extra_hosts: host.docker.internal:host-gateway` to reach the host machine's PostgreSQL on Linux. If your PostgreSQL is on a different host, set `POSTGRES_HOST` to its IP or hostname.

## RPC Proxy

The RPC proxy (`rpc-proxy/`) is a lightweight Fastify service that sits between graph-node and the RPC gateway. It handles two things:

1. **Header injection**: Adds the `x-api-key` header required by the gateway.
2. **Response normalization**: If the gateway returns a wrapped envelope (`{status, result, message}`) instead of standard JSON-RPC 2.0, the proxy unwraps it to `{jsonrpc, id, result}`.

Graph-node connects to it internally via `http://rpc-proxy:3000` — no external port is exposed.

## Running

```bash
docker compose up --build
```

After graph-node starts, deploy the subgraph:

```bash
yarn create-local
yarn deploy-local
```

## Exposed Ports

| Port | Service | Purpose |
|---|---|---|
| `8000` | graph-node | **GraphQL query endpoint** |
| `8001` | graph-node | GraphQL subscriptions |
| `8020` | graph-node | Admin API (deploy/remove subgraphs) |
| `8030` | graph-node | Indexing status API |
| `8040` | graph-node | Prometheus metrics |
| `5001` | ipfs | IPFS API |

## Monitoring Endpoints

### GraphQL Queries (port 8000)

After deploying the subgraph, query it at:

```
http://localhost:8000/subgraphs/name/eigenwatch-ethereum
```

Every query supports the `_meta` field for sync status:

```graphql
{
  _meta {
    block { number }
    hasIndexingErrors
    deployment
  }
}
```

### Indexing Status (port 8030)

The equivalent of The Graph Studio's sync percentage. POST to `http://localhost:8030/graphql`:

```graphql
{
  indexingStatuses {
    subgraph
    synced
    health
    chains {
      network
      latestBlock { number }
      chainHeadBlock { number }
    }
    fatalError { message }
  }
}
```

`latestBlock.number / chainHeadBlock.number` gives you the sync progress ratio.

### Prometheus Metrics (port 8040)

```bash
curl http://localhost:8040/metrics
```

Exposes entity counts, block processing rates, query latency, handler execution times, and more. Scrape this with Prometheus and visualize with Grafana.

### RPC Proxy Health Check

```bash
curl http://localhost:3000/health
# Returns: {"status":"ok"}
```

Only reachable from within the Docker network unless you expose the port.
