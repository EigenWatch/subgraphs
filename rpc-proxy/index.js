const fastify = require("fastify")({ logger: true });
const client = require("prom-client");

// Initialize Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
const requestCounter = new client.Counter({
  name: "rpc_requests_total",
  help: "Total RPC requests by provider, method, and status",
  labelNames: ["provider", "method", "status"],
  registers: [register],
});

const requestDuration = new client.Histogram({
  name: "rpc_request_duration_seconds",
  help: "RPC request duration in seconds",
  labelNames: ["provider", "method"],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const errorCounter = new client.Counter({
  name: "rpc_provider_errors_total",
  help: "Total errors by provider and error type",
  labelNames: ["provider", "error_type"],
  registers: [register],
});

const fallbackCounter = new client.Counter({
  name: "rpc_fallbacks_total",
  help: "Number of times fallback providers were used",
  labelNames: ["from_provider", "to_provider"],
  registers: [register],
});

const completeFailureCounter = new client.Counter({
  name: "rpc_complete_failures_total",
  help: "Requests that failed on ALL providers - client received an error",
  labelNames: ["method"],
  registers: [register],
});

const activeProvider = new client.Gauge({
  name: "rpc_active_provider",
  help: "Currently active provider (1 = primary, 2 = first fallback, etc)",
  registers: [register],
});

const loadBalanceMode = new client.Gauge({
  name: "rpc_load_balance_mode",
  help: "Current mode (0 = fallback only, 1 = load balancing)",
  registers: [register],
});

const blocksBehind = new client.Gauge({
  name: "rpc_blocks_behind",
  help: "Number of blocks the subgraph is behind the chain head",
  registers: [register],
});

const methodRoutingCounter = new client.Counter({
  name: "rpc_method_routing_total",
  help: "How RPC calls are routed by method and provider",
  labelNames: ["method", "provider", "route_type"],
  registers: [register],
});

const infuraCreditsGauge = new client.Gauge({
  name: "rpc_infura_credits_consumed",
  help: "Estimated daily Infura credit usage",
  labelNames: ["provider"],
  registers: [register],
});

const rateLimitCounter = new client.Counter({
  name: "rpc_rate_limit_hits_total",
  help: "Rate limit (429/402) responses received",
  labelNames: ["provider", "type"],
  registers: [register],
});

// Infura credit costs per method (approximate)
const INFURA_CREDIT_COSTS = {
  eth_getLogs: 255,
  eth_call: 26,
  eth_getBlockByNumber: 16,
  eth_getBlockByHash: 16,
  eth_blockNumber: 10,
  eth_chainId: 0,
  eth_getTransactionReceipt: 15,
  eth_getTransactionByHash: 15,
  net_version: 0,
  default: 20,
};

const INFURA_DAILY_CREDIT_LIMIT = 3_000_000;
const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in ms

// Per-provider daily credit tracking
// Reset logic: clear when the day changes
let currentDay = new Date().getUTCDate();
const providerCredits = {};

function checkMidnightReset() {
  const now = new Date();
  const today = now.getUTCDate();
  if (today !== currentDay) {
    fastify.log.info(
      { oldDay: currentDay, newDay: today },
      "Midnight reset: clearing credits",
    );
    for (const provider in providerCredits) {
      providerCredits[provider] = 0;
    }
    currentDay = today;
    // Reset gauges
    for (const providerName in providerCredits) {
      infuraCreditsGauge.set({ provider: providerName }, 0);
    }
  }
}

// Rotation state for backfill logs
let lastInfuraIndex = -1;

const throttleDelayHistogram = new client.Histogram({
  name: "rpc_throttle_delay_seconds",
  help: "Time spent waiting due to rate limit throttling",
  labelNames: ["provider"],
  buckets: [0, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

function getCreditsConsumed(providerName) {
  checkMidnightReset();
  return providerCredits[providerName] || 0;
}

function addCredits(providerName, method) {
  checkMidnightReset();
  const cost = INFURA_CREDIT_COSTS[method] || INFURA_CREDIT_COSTS.default;
  providerCredits[providerName] = (providerCredits[providerName] || 0) + cost;

  const total = providerCredits[providerName];
  infuraCreditsGauge.set({ provider: providerName }, total);

  if (total >= INFURA_DAILY_CREDIT_LIMIT * 0.9) {
    fastify.log.warn(
      {
        provider: providerName,
        credits: total,
        limit: INFURA_DAILY_CREDIT_LIMIT,
      },
      "Infura credit usage at 90%+ of daily limit",
    );
  }
}

function isInfuraProvider(provider) {
  return provider.name.startsWith("infura");
}

function isProviderOverDailyLimit(provider) {
  if (!isInfuraProvider(provider)) return false;
  return getCreditsConsumed(provider.name) >= INFURA_DAILY_CREDIT_LIMIT;
}

// Provider configuration
// Each provider has:
//   backfillRole: "logs" (eth_getLogs during backfill), "general" (other RPC during backfill), "all" (normal mode), "none" (excluded during backfill)
//   backfillWeight: weight during backfill for its designated role
//   normalWeight: weight after backfill (caught-up mode)
const PROVIDERS = [
  {
    name: "thebuidl",
    url: process.env.RPC_GATEWAY_URL || "https://gateway.thebuidl.xyz/query",
    apiKey: process.env.RPC_API_KEY,
    headers: (apiKey) => ({ "x-api-key": apiKey }),
    unwrap: true,
    backfillRole: "none",
    backfillWeight: 0,
    normalWeight: 40,
  },
  {
    name: "alchemy",
    url: process.env.ALCHEMY_RPC_URL,
    apiKey: null,
    headers: () => ({}),
    unwrap: false,
    backfillRole: "general",
    backfillWeight: 33,
    normalWeight: 12,
  },
  {
    name: "alchemy2",
    url: process.env.ALCHEMY_RPC_URL_2,
    apiKey: null,
    headers: () => ({}),
    unwrap: false,
    backfillRole: "general",
    backfillWeight: 33,
    normalWeight: 12,
  },
  {
    name: "alchemy3",
    url: process.env.ALCHEMY_RPC_URL_3,
    apiKey: null,
    headers: () => ({}),
    unwrap: false,
    backfillRole: "general",
    backfillWeight: 34,
    normalWeight: 12,
  },
  {
    name: "infura",
    url: process.env.INFURA_RPC_URL,
    apiKey: null,
    headers: () => ({}),
    unwrap: false,
    backfillRole: "logs",
    backfillWeight: 33,
    normalWeight: 12,
  },
  {
    name: "infura2",
    url: process.env.INFURA_RPC_URL_2,
    apiKey: null,
    headers: () => ({}),
    unwrap: false,
    backfillRole: "logs",
    backfillWeight: 33,
    normalWeight: 12,
  },
  {
    name: "infura3",
    url: process.env.INFURA_RPC_URL_3,
    apiKey: null,
    headers: () => ({}),
    unwrap: false,
    backfillRole: "logs",
    backfillWeight: 34,
    normalWeight: 12,
  },
  // Public free RPCs - only used in normal mode (NOT during backfill)
  // These are full nodes, not archive nodes, so they cannot serve historical data reliably
  // {
  //   name: "ankr",
  //   url: "https://rpc.ankr.com/eth",
  //   apiKey: null,
  //   headers: () => ({}),
  //   unwrap: false,
  //   backfillRole: "none",
  //   backfillWeight: 0,
  //   normalWeight: 0,
  // },
  // {
  //   name: "publicnode",
  //   url: "https://ethereum-rpc.publicnode.com",
  //   apiKey: null,
  //   headers: () => ({}),
  //   unwrap: false,
  //   backfillRole: "none",
  //   backfillWeight: 0,
  //   normalWeight: 0,
  // },
  // {
  //   name: "llamarpc",
  //   url: "https://eth.llamarpc.com",
  //   apiKey: null,
  //   headers: () => ({}),
  //   unwrap: false,
  //   backfillRole: "none",
  //   backfillWeight: 0,
  //   normalWeight: 0,
  // },
];

const PORT = process.env.PORT || 3000;
const BACKFILL_THRESHOLD = parseInt(
  process.env.BACKFILL_THRESHOLD || "1000",
  10,
);

// State tracking
let currentBlocksBehind = Infinity; // Start in backfill mode
let isBackfillMode = true;

// Track providers temporarily disabled due to 402 (daily quota exceeded)
const disabledProviders = new Set();

// Get list of configured providers
function getActiveProviders() {
  return PROVIDERS.filter((p) => {
    if (disabledProviders.has(p.name)) return false;
    if (p.name === "thebuidl") return p.apiKey;
    return p.url;
  });
}

// Get providers for a specific role during backfill
function getBackfillProviders(role) {
  return getActiveProviders().filter((p) => {
    if (p.backfillRole === role) return true;
    if (p.backfillRole === "fallback") return false; // fallbacks added separately
    return false;
  });
}

// Select provider based on weights
function selectWeightedProvider(providers, weightKey) {
  if (providers.length === 0) return null;
  if (providers.length === 1) return providers[0];

  const totalWeight = providers.reduce(
    (sum, p) => sum + (p[weightKey] || 0),
    0,
  );
  if (totalWeight === 0) return providers[0];

  let random = Math.random() * totalWeight;
  for (const provider of providers) {
    random -= provider[weightKey] || 0;
    if (random <= 0) return provider;
  }
  return providers[0];
}

// Build ordered provider list for a request based on method and mode
function getProviderOrder(method) {
  const allActive = getActiveProviders();

  if (!isBackfillMode) {
    // Normal mode: thebuidl primary, all others as weighted fallbacks
    const primary = allActive.filter((p) => p.normalWeight > 0);
    const fallbacks = allActive.filter((p) => p.normalWeight === 0);

    // Sort by normalWeight descending (thebuidl first)
    primary.sort((a, b) => b.normalWeight - a.normalWeight);
    return [...primary, ...fallbacks];
  }

  // Backfill mode: strict routing by method, NO cross-fallbacks
  // eth_getLogs ONLY goes to Infura (5000 block range support)
  // All other calls ONLY go to Alchemy
  // If all providers in a group fail, the request fails — graph-node retries naturally
  // This prevents Alchemy eth_getLogs errors from making graph-node shrink block ranges
  if (method === "eth_getLogs") {
    const logsProviders = getBackfillProviders("logs").filter(
      (p) => !isProviderOverDailyLimit(p),
    );
    if (logsProviders.length === 0) return [];

    // Simple round-robin rotation
    lastInfuraIndex = (lastInfuraIndex + 1) % logsProviders.length;

    // Start with the next one in line, followed by the rest
    const ordered = [];
    for (let i = 0; i < logsProviders.length; i++) {
      ordered.push(logsProviders[(lastInfuraIndex + i) % logsProviders.length]);
    }
    return ordered;
  } else {
    return getBackfillProviders("general");
  }
}

// Normalize response from wrapped format if needed
function normalizeResponse(data, provider) {
  if (data.jsonrpc === "2.0") {
    return data;
  }

  if (
    provider.unwrap &&
    data.status === "success" &&
    data.result !== undefined
  ) {
    if (data.result.jsonrpc === "2.0") {
      return data.result;
    }
    return { jsonrpc: "2.0", id: null, result: data.result };
  }

  if (data.error || data.status === "error") {
    return {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: data.message || "Gateway error" },
    };
  }

  return data;
}

// Make RPC request to a single provider
async function makeRequest(provider, body, method) {
  const headers = {
    "Content-Type": "application/json",
    ...provider.headers(provider.apiKey),
  };

  // Delay Infura requests by 2 seconds to avoid rate limits
  if (isInfuraProvider(provider)) {
    fastify.log.debug(
      { provider: provider.name, method },
      "Applying 2s delay to Infura request",
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const timer = requestDuration.startTimer({ provider: provider.name, method });

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      headers,
      body,
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      rateLimitCounter.inc({ provider: provider.name, type: "throttle" });
      fastify.log.warn(
        { provider: provider.name, retryAfter },
        "Rate limited (429)",
      );
      throw new Error(
        `Rate limited (429), retry after ${retryAfter || "unknown"}s`,
      );
    }

    // Handle daily quota exceeded (Infura rolling 24h limit)
    if (response.status === 402) {
      rateLimitCounter.inc({ provider: provider.name, type: "quota_exceeded" });
      fastify.log.error(
        { provider: provider.name },
        "Daily quota exceeded (402) - disabling provider until credits roll off",
      );
      disabledProviders.add(provider.name);
      // Re-enable when the oldest credit entry expires from the rolling window
      // Check every 5 minutes if credits have dropped below the limit
      const recheckInterval = setInterval(
        () => {
          const credits = getCreditsConsumed(provider.name);
          if (credits < INFURA_DAILY_CREDIT_LIMIT * 0.9) {
            disabledProviders.delete(provider.name);
            clearInterval(recheckInterval);
            fastify.log.info(
              { provider: provider.name, credits },
              "Provider re-enabled after credits rolled off",
            );
          }
        },
        5 * 60 * 1000,
      );
      throw new Error("Daily quota exceeded (402)");
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const normalized = normalizeResponse(data, provider);

    if (normalized.error) {
      const errorType = normalized.error.code?.toString() || "unknown";
      errorCounter.inc({ provider: provider.name, error_type: errorType });
      throw new Error(normalized.error.message || "RPC error");
    }

    timer();
    requestCounter.inc({ provider: provider.name, method, status: "success" });

    // Track Infura credit usage
    if (isInfuraProvider(provider)) {
      addCredits(provider.name, method);
    }

    return normalized;
  } catch (err) {
    timer();
    requestCounter.inc({ provider: provider.name, method, status: "error" });

    const errorType = err.message.includes("HTTP")
      ? "http_error"
      : err.message.includes("429")
        ? "rate_limit"
        : err.message.includes("402")
          ? "quota_exceeded"
          : "rpc_error";
    errorCounter.inc({ provider: provider.name, error_type: errorType });

    throw err;
  }
}

// Fetch current indexing status to determine mode
async function updateIndexingStatus() {
  try {
    const response = await fetch("http://graph-node:8030/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{
          indexingStatuses {
            synced
            health
            chains {
              network
              chainHeadBlock { number }
              latestBlock { number }
            }
          }
        }`,
      }),
    });

    if (!response.ok) {
      fastify.log.warn("Failed to fetch indexing status");
      return;
    }

    const data = await response.json();
    const statuses = data.data?.indexingStatuses || [];

    for (const status of statuses) {
      for (const chain of status.chains || []) {
        if (chain.network === "mainnet") {
          const chainHead = parseInt(chain.chainHeadBlock?.number || "0", 10);
          const latestIndexed = parseInt(chain.latestBlock?.number || "0", 10);
          const behind = chainHead - latestIndexed;

          currentBlocksBehind = behind;
          blocksBehind.set(behind);

          const wasBackfillMode = isBackfillMode;
          isBackfillMode = behind > BACKFILL_THRESHOLD;
          loadBalanceMode.set(isBackfillMode ? 1 : 0);

          if (wasBackfillMode !== isBackfillMode) {
            fastify.log.info(
              {
                blocksBehind: behind,
                threshold: BACKFILL_THRESHOLD,
                mode: isBackfillMode ? "backfill" : "normal",
              },
              "Mode changed",
            );
          }
          return;
        }
      }
    }
  } catch (err) {
    fastify.log.warn({ error: err.message }, "Error updating indexing status");
  }
}

// Health check endpoint
fastify.get("/health", async () => {
  const providers = getActiveProviders();
  const infuraProviders = providers.filter(isInfuraProvider);
  const creditInfo = {};
  for (const p of infuraProviders) {
    const bucket = getOrCreateBucket(p.name);
    refillBucket(bucket);
    creditInfo[p.name] = {
      creditsUsed: getCreditsConsumed(p.name),
      dailyLimit: INFURA_DAILY_CREDIT_LIMIT,
      percentUsed:
        (
          (getCreditsConsumed(p.name) / INFURA_DAILY_CREDIT_LIMIT) *
          100
        ).toFixed(1) + "%",
    };
  }

  return {
    status: "ok",
    providers: providers.map((p) => ({
      name: p.name,
      role: isBackfillMode ? p.backfillRole : "all",
      weight: isBackfillMode ? p.backfillWeight : p.normalWeight,
    })),
    mode: isBackfillMode ? "backfill" : "normal",
    blocksBehind: currentBlocksBehind,
    threshold: BACKFILL_THRESHOLD,
    disabledProviders: [...disabledProviders],
    infuraCredits: creditInfo,
  };
});

// Prometheus metrics endpoint
fastify.get("/metrics", async (request, reply) => {
  reply.header("Content-Type", register.contentType);
  return register.metrics();
});

// Main RPC proxy endpoint
fastify.post("/", async (request, reply) => {
  const body = JSON.stringify(request.body);
  const method = request.body.method || "unknown";
  const providers = getProviderOrder(method);

  if (providers.length === 0) {
    return {
      jsonrpc: "2.0",
      id: request.body.id ?? null,
      error: { code: -32603, message: "No RPC providers configured" },
    };
  }

  let lastError;
  let previousProvider = null;
  const triedProviders = new Set();

  // In backfill mode, select weighted from the primary group first
  if (isBackfillMode) {
    const isLogMethod = method === "eth_getLogs";
    const weightKey = "backfillWeight";

    // Get primary providers for this method (not yet tried)
    const primaryRole = isLogMethod ? "logs" : "general";
    const primaryProviders = providers.filter(
      (p) => p.backfillRole === primaryRole && !triedProviders.has(p.name),
    );

    // Try weighted selection from primary group first
    while (primaryProviders.length > 0) {
      const available = primaryProviders.filter(
        (p) => !triedProviders.has(p.name),
      );
      if (available.length === 0) break;

      const provider = selectWeightedProvider(available, weightKey);
      if (!provider) break;

      triedProviders.add(provider.name);

      const routeType = isLogMethod ? "logs_primary" : "general_primary";
      methodRoutingCounter.inc({
        method,
        provider: provider.name,
        route_type: routeType,
      });

      try {
        const result = await makeRequest(provider, body, method);
        activeProvider.set(PROVIDERS.indexOf(provider) + 1);
        fastify.log.info(
          {
            provider: provider.name,
            method,
            mode: "backfill",
            route: routeType,
          },
          "Request successful",
        );
        return result;
      } catch (err) {
        fastify.log.warn(
          { provider: provider.name, method, error: err.message },
          "Provider failed, trying next",
        );
        if (previousProvider) {
          fallbackCounter.inc({
            from_provider: previousProvider,
            to_provider: provider.name,
          });
        }
        previousProvider = provider.name;
        lastError = err;
      }
    }
  } else {
    // Normal mode: try providers in order (thebuidl first, then fallbacks)
    for (const provider of providers) {
      if (triedProviders.has(provider.name)) continue;
      triedProviders.add(provider.name);

      methodRoutingCounter.inc({
        method,
        provider: provider.name,
        route_type: "normal",
      });

      try {
        const result = await makeRequest(provider, body, method);
        activeProvider.set(PROVIDERS.indexOf(provider) + 1);
        fastify.log.info(
          { provider: provider.name, method, mode: "normal" },
          "Request successful",
        );
        return result;
      } catch (err) {
        fastify.log.warn(
          { provider: provider.name, method, error: err.message },
          "Provider failed, trying next",
        );
        if (previousProvider) {
          fallbackCounter.inc({
            from_provider: previousProvider,
            to_provider: provider.name,
          });
        }
        previousProvider = provider.name;
        lastError = err;
      }
    }
  }

  // Track complete failure
  completeFailureCounter.inc({ method });

  fastify.log.error(
    { method, error: lastError?.message },
    "All providers failed",
  );
  return {
    jsonrpc: "2.0",
    id: request.body.id ?? null,
    error: {
      code: -32603,
      message: lastError?.message || "All RPC providers failed",
    },
  };
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  const providers = getActiveProviders();
  fastify.log.info(
    {
      providers: providers.map((p) => ({
        name: p.name,
        role: isBackfillMode ? p.backfillRole : "all",
      })),
      backfillThreshold: BACKFILL_THRESHOLD,
      mode: isBackfillMode ? "backfill" : "normal",
    },
    "RPC proxy started",
  );

  // Update indexing status every 30 seconds
  updateIndexingStatus();
  setInterval(updateIndexingStatus, 30000);
});
