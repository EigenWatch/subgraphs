# Setup & Deployment Guide

## Prerequisites

- **Node.js**: v16 or higher
- **Yarn**: v1.22 or higher
- **Graph CLI**: `npm install -g @graphprotocol/graph-cli`

## Installation

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd eigenwatch/subgraphs
yarn install
```

## Local Development

### 1. Code Generation

Whenever you modify `schema.graphql` or `subgraph.yaml`, you must regenerate the TypeScript types:

```bash
yarn codegen
```

This will create/update files in the `generated/` directory.

### 2. Build

To compile the subgraph (AssemblyScript to WASM):

```bash
yarn build
```

The build artifacts will be stored in the `build/` directory.

### 3. Testing

(If tests are implemented)

```bash
yarn test
```

## Deployment

### Deploying to The Graph Studio

1.  **Authenticate**:

    ```bash
    graph auth --studio <DEPLOY_KEY>
    ```

2.  **Deploy**:
    ```bash
    graph deploy --studio <SUBGRAPH_SLUG>
    ```
    Replace `<SUBGRAPH_SLUG>` with your subgraph's name in the Studio (e.g., `eigenwatch-mainnet`).

### Deploying to a Hosted Service (Legacy)

```bash
graph deploy --product hosted-service <USERNAME>/<SUBGRAPH_NAME>
```

## Configuration

- **`subgraph.yaml`**: The main configuration file. Defines data sources, start blocks, and mapping handlers.
- **`schema.graphql`**: The GraphQL schema defining the data model.
- **`networks.json`**: Configuration for different networks (address overrides).

## Troubleshooting

### "AssemblyScript Error"

If you see errors during `yarn build`, ensure you are using compatible versions of `assemblyscript` and `@graphprotocol/graph-ts`. Check `package.json`.

### "Type not found"

Run `yarn codegen` again. Sometimes the generated types get out of sync with the schema.
