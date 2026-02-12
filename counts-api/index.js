"use strict";

const Fastify = require("fastify");
const { Pool } = require("pg");

// ─── Configuration ──────────────────────────────────────
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS || "60000", 10); // 60s default
const PORT = parseInt(process.env.PORT || "3001", 10);
const SCHEMA_RETRY_INTERVAL_MS = 10000; // 10s between retries

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "postgres",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "",
  database: process.env.POSTGRES_DB || "graph_node",
});

// ─── Schema Discovery ──────────────────────────────────
let schemaName = null;
let schemaDiscoveredAt = 0;

/**
 * Discover the sgdN schema name for our subgraph deployment.
 * Uses only `public.deployment_schemas` which is the most reliable
 * table across all Graph Node versions.
 * Picks the most recently created schema (highest sgdN number).
 */
async function discoverSchema() {
  const client = await pool.connect();
  try {
    // Query deployment_schemas directly — works across all Graph Node versions
    const result = await client.query(`
      SELECT name, subgraph
      FROM public.deployment_schemas
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      throw new Error("No deployment schemas found. Is the subgraph deployed?");
    }

    schemaName = result.rows[0].name;
    const deploymentHash = result.rows[0].subgraph;
    schemaDiscoveredAt = Date.now();
    console.log(
      `Schema discovered: ${schemaName} (deployment: ${deploymentHash})`,
    );
    return schemaName;
  } finally {
    client.release();
  }
}

/**
 * Try to discover schema with retries. Does not throw — logs errors and returns false.
 */
async function tryDiscoverSchema() {
  try {
    await discoverSchema();
    return true;
  } catch (err) {
    console.error(
      `Schema discovery failed: ${err.message}. Will retry in ${SCHEMA_RETRY_INTERVAL_MS / 1000}s...`,
    );
    return false;
  }
}

// ─── Cached Counts ──────────────────────────────────────
let cachedCounts = null;
let cachedAt = 0;

/**
 * Get all entity table counts from the sgdN schema.
 * Graph Node creates a table for each entity in the subgraph schema,
 * using the snake_case version of the entity name.
 */
async function fetchCounts() {
  if (!schemaName || Date.now() - schemaDiscoveredAt > 3600000) {
    // Re-discover schema every hour or if not yet discovered
    await discoverSchema();
  }

  const client = await pool.connect();
  try {
    // Get all entity tables in the schema
    const tablesResult = await client.query(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'poi2$%'
        AND table_name != 'data_sources$'
      ORDER BY table_name
    `,
      [schemaName],
    );

    const counts = {};

    // Use reltuples for approximate fast counts (updated by ANALYZE/VACUUM)
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const countResult = await client.query(
        `
        SELECT reltuples::bigint AS count
        FROM pg_class
        WHERE oid = $1::regclass
      `,
        [`"${schemaName}"."${tableName}"`],
      );

      counts[tableName] = countResult.rows[0]?.count ?? 0;
    }

    return counts;
  } finally {
    client.release();
  }
}

// ─── Fastify Server ─────────────────────────────────────
const app = Fastify({ logger: true });

app.get("/health", async () => ({
  status: schemaName ? "ok" : "waiting_for_schema",
  schema: schemaName || null,
}));

/**
 * GET /counts
 * Returns approximate row counts for every entity table.
 * Results are cached for CACHE_TTL_MS milliseconds.
 *
 * Optional query params:
 *   ?exact=true  — use COUNT(*) for exact counts (slower)
 *   ?entity=operator,avs  — only count specific entities
 */
app.get("/counts", async (request, reply) => {
  if (!schemaName) {
    reply.code(503);
    return {
      error: "Schema not yet discovered. The subgraph may still be deploying.",
    };
  }

  const exact = request.query.exact === "true";
  const entityFilter = request.query.entity
    ? request.query.entity.split(",").map((e) => e.trim().toLowerCase())
    : null;

  // Use cache for approximate counts if valid
  if (!exact && cachedCounts && Date.now() - cachedAt < CACHE_TTL_MS) {
    const result = entityFilter
      ? Object.fromEntries(
          Object.entries(cachedCounts).filter(([k]) =>
            entityFilter.includes(k),
          ),
        )
      : cachedCounts;

    return {
      schema: schemaName,
      cached: true,
      cachedAt: new Date(cachedAt).toISOString(),
      counts: result,
    };
  }

  if (exact) {
    // Exact counts using COUNT(*) — slower but precise
    const client = await pool.connect();
    try {
      const tablesResult = await client.query(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE 'poi2$%'
          AND table_name != 'data_sources$'
        ORDER BY table_name
      `,
        [schemaName],
      );

      const counts = {};
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        if (entityFilter && !entityFilter.includes(tableName)) continue;

        // Safe: tableName comes from information_schema, not user input
        const countResult = await client.query(
          `SELECT COUNT(*) AS count FROM "${schemaName}"."${tableName}"`,
        );
        counts[tableName] = parseInt(countResult.rows[0].count, 10);
      }

      return { schema: schemaName, cached: false, exact: true, counts };
    } finally {
      client.release();
    }
  }

  // Approximate counts (fast)
  const counts = await fetchCounts();
  cachedCounts = counts;
  cachedAt = Date.now();

  const result = entityFilter
    ? Object.fromEntries(
        Object.entries(counts).filter(([k]) => entityFilter.includes(k)),
      )
    : counts;

  return {
    schema: schemaName,
    cached: false,
    cachedAt: new Date(cachedAt).toISOString(),
    counts: result,
  };
});

// ─── Startup ────────────────────────────────────────────
async function start() {
  // Start the HTTP server immediately (don't block on schema discovery)
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Counts API listening on port ${PORT}`);

  // Try to discover schema — retry in background if it fails
  const discovered = await tryDiscoverSchema();
  if (!discovered) {
    const retryInterval = setInterval(async () => {
      const ok = await tryDiscoverSchema();
      if (ok) clearInterval(retryInterval);
    }, SCHEMA_RETRY_INTERVAL_MS);
  }
}

start();
