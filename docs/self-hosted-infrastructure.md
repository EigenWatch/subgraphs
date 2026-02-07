# Self-Hosted Infrastructure

The subgraph has been migrated from The Graph Studio to a self-hosted Graph Node stack. This document covers the infrastructure components, configuration, security, and monitoring.

## Stack Overview

| Service        | Purpose                                           | Image / Source                 |
| -------------- | ------------------------------------------------- | ------------------------------ |
| **nginx**      | Reverse proxy with API key authentication         | `./nginx` (custom)             |
| **graph-node** | Indexes blockchain events, serves GraphQL         | `graphprotocol/graph-node`     |
| **rpc-proxy**  | Injects API key headers, normalizes RPC responses | `./rpc-proxy` (custom Node.js) |
| **ipfs**       | Stores subgraph manifests and schemas             | `ipfs/kubo:v0.17.0`            |
| **postgres**   | Stores indexed entity data                        | `postgres:15`                  |
| **deployer**   | Automated subgraph deployment                     | `./deployer` (custom)          |

## Configuration

All secrets and connection details are configured via environment variables. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Required Variables

| Variable            | Description                                                         | Example                              |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `RPC_API_KEY`       | API key for the RPC gateway                                         | `your_api_key_here`                  |
| `RPC_GATEWAY_URL`   | RPC endpoint URL (defaults to `https://gateway.thebuidl.xyz/query`) | `https://gateway.thebuidl.xyz/query` |
| `POSTGRES_HOST`     | PostgreSQL host                                                     | `postgres`                           |
| `POSTGRES_PORT`     | PostgreSQL port (internal, always `5432`)                           | `5432`                               |
| `POSTGRES_USER`     | PostgreSQL user                                                     | `postgres`                           |
| `POSTGRES_PASSWORD` | PostgreSQL password                                                 | `your_password_here`                 |
| `POSTGRES_DB`       | PostgreSQL database name                                            | `graph_node`                         |
| `GRAPHQL_API_KEY`   | API key for GraphQL endpoint authentication                         | `your_secure_api_key_here`           |

### PostgreSQL Setup

The PostgreSQL database is created automatically by the `postgres` container with the correct settings:

- **Encoding**: UTF8
- **Locale**: C (required by graph-node)

The database is initialized via `POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C"` in docker-compose.

## Running

### Start Infrastructure and Deploy

```bash
docker compose up -d --build
```

The deployer container will automatically:

1. Wait for graph-node and IPFS to be ready
2. Run `graph codegen` and `graph build`
3. Create and deploy the subgraph
4. Exit after successful deployment

### Redeploy After Changes

To redeploy after making changes to the subgraph, restart the deployer:

```bash
docker compose up deployer --build
```

---

## Security

### API Key Authentication

All GraphQL endpoints are protected by API key authentication via nginx. Clients must include the `X-API-Key` header:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_secure_api_key_here" \
  -d '{"query": "{ _meta { block { number } } }"}' \
  http://your-server:7000/subgraphs/name/eigenwatch-ethereum
```

Without a valid API key, requests return `401 Unauthorized`.

### Port Security

| Port   | Service    | Access      | Purpose                             |
| ------ | ---------- | ----------- | ----------------------------------- |
| `7000` | nginx      | 🔐 Public   | GraphQL + Status (API key required) |
| —      | graph-node | 🔒 Internal | No direct external access           |
| —      | ipfs       | 🔒 Internal | Localhost only (127.0.0.1:7005)     |
| —      | postgres   | 🔒 Internal | Localhost only (127.0.0.1:7006)     |

Only port `7000` is exposed publicly, and it requires API key authentication.

### Rate Limiting

The nginx proxy includes rate limiting:

- **100 requests/second** per IP
- **Burst**: 50 requests

---

## RPC Proxy

The RPC proxy (`rpc-proxy/`) is a lightweight Fastify service that sits between graph-node and the RPC gateway. It handles:

1. **Header injection**: Adds the `x-api-key` header required by the gateway.
2. **Response normalization**: If the gateway returns a wrapped envelope (`{status, result, message}`) instead of standard JSON-RPC 2.0, the proxy unwraps it to `{jsonrpc, id, result}`.

Graph-node connects to it internally via `http://rpc-proxy:3000` — no external port is exposed.

---

## Monitoring Endpoints

All monitoring endpoints require the `X-API-Key` header.

### GraphQL Queries

Query the subgraph at:

```
POST http://your-server:7000/subgraphs/name/eigenwatch-ethereum
Header: X-API-Key: your_api_key
```

Every query supports the `_meta` field for sync status:

```graphql
{
  _meta {
    block {
      number
    }
    hasIndexingErrors
    deployment
  }
}
```

### Indexing Status

Check sync progress at:

```
POST http://your-server:7000/graphql
Header: X-API-Key: your_api_key
```

```graphql
{
  indexingStatuses {
    subgraph
    synced
    health
    chains {
      network
      latestBlock {
        number
      }
      chainHeadBlock {
        number
      }
    }
    fatalError {
      message
    }
  }
}
```

`latestBlock.number / chainHeadBlock.number` gives you the sync progress ratio.

### Prometheus Metrics

```bash
curl http://your-server:7000/metrics
```

Exposes entity counts, block processing rates, query latency, handler execution times, and more. Scrape this with Prometheus and visualize with Grafana.

### Health Check

```bash
curl http://your-server:7000/health
# Returns: ok
```

---

## Deployer Container

The deployer (`deployer/`) automates subgraph deployment from within the Docker network. This eliminates the need to expose admin ports externally.

### How It Works

1. Waits for graph-node admin API (`http://graph-node:8020`) to be ready
2. Waits for IPFS (`http://ipfs:5001`) to be ready
3. Runs `graph codegen` and `graph build`
4. Creates the subgraph (if not exists)
5. Deploys the subgraph with version label `v1`

### Configuration

| Environment Variable | Description          | Default               |
| -------------------- | -------------------- | --------------------- |
| `SUBGRAPH_NAME`      | Name of the subgraph | `eigenwatch-ethereum` |

### Files

| File                  | Purpose                              |
| --------------------- | ------------------------------------ |
| `deployer/Dockerfile` | Container with graph-cli installed   |
| `deployer/deploy.sh`  | Deployment script with health checks |

---

## Nginx Proxy

The nginx proxy (`nginx/`) handles API key authentication and rate limiting.

### Files

| File                        | Purpose                                       |
| --------------------------- | --------------------------------------------- |
| `nginx/Dockerfile`          | Nginx with envsubst for variable substitution |
| `nginx/nginx.conf.template` | Config template with API key validation       |
| `nginx/start.sh`            | Startup script that injects env vars          |

### Endpoints Proxied

| Path           | Backend         | Auth Required |
| -------------- | --------------- | ------------- |
| `/subgraphs/*` | graph-node:8000 | ✅ Yes        |
| `/graphql`     | graph-node:8030 | ✅ Yes        |
| `/metrics`     | graph-node:8040 | ❌ No         |
| `/health`      | Direct response | ❌ No         |

---

## Troubleshooting

### Database Encoding Error

```
database encoding is `SQL_ASCII` but must be `UTF8`
```

**Fix**: Delete the postgres data directory and restart:

```bash
docker compose down
rm -rf ./data/postgres-c
docker compose up -d
```

### Connection Refused to Postgres

Ensure `POSTGRES_PORT` in `.env` is set to `5432` (internal port), not the external mapped port.

### Deployer Fails

Check if graph-node is running:

```bash
docker compose logs graph-node
```

Wait for "Starting up" message before running the deployer.
