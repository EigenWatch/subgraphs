#!/bin/sh
set -e

GRAPH_NODE_ADMIN="http://graph-node:8020"
IPFS_NODE="http://ipfs:5001"
SUBGRAPH_NAME="${SUBGRAPH_NAME:-eigenwatch-ethereum}"

echo "Waiting for graph-node admin API..."
until wget -q --spider "$GRAPH_NODE_ADMIN" 2>/dev/null; do
  echo "  graph-node not ready, waiting 5s..."
  sleep 5
done
echo "Graph-node is ready!"

echo "Waiting for IPFS..."
until wget -q --spider "$IPFS_NODE/api/v0/version" 2>/dev/null; do
  echo "  IPFS not ready, waiting 5s..."
  sleep 5
done
echo "IPFS is ready!"

cd /subgraph

echo "Running codegen..."
graph codegen

echo "Building subgraph..."
graph build

echo "Creating subgraph: $SUBGRAPH_NAME"
graph create --node "$GRAPH_NODE_ADMIN" "$SUBGRAPH_NAME" || echo "Subgraph may already exist, continuing..."

echo "Deploying subgraph: $SUBGRAPH_NAME"
graph deploy --node "$GRAPH_NODE_ADMIN" --ipfs "$IPFS_NODE" "$SUBGRAPH_NAME" --version-label v1

echo "✅ Deployment complete!"
