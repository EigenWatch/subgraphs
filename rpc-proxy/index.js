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

const activeProvider = new client.Gauge({
  name: "rpc_active_provider",
  help: "Currently active provider (1 = primary, 2 = first fallback, etc)",
  registers: [register],
});

// Provider configuration
const PROVIDERS = [
  {
    name: "thebuidl",
    url: process.env.RPC_GATEWAY_URL || "https://gateway.thebuidl.xyz/query",
    apiKey: process.env.RPC_API_KEY,
    headers: (apiKey) => ({ "x-api-key": apiKey }),
    unwrap: true,
  },
  {
    name: "alchemy",
    url: process.env.ALCHEMY_RPC_URL,
    apiKey: null,
    headers: () => ({}),
    unwrap: false,
  },
  {
    name: "infura",
    url: process.env.INFURA_RPC_URL,
    apiKey: null,
    headers: () => ({}),
    unwrap: false,
  },
];

const PORT = process.env.PORT || 3000;

// Get list of configured providers
function getActiveProviders() {
  return PROVIDERS.filter((p) => {
    if (p.name === "thebuidl") return p.apiKey;
    return p.url;
  });
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

  const timer = requestDuration.startTimer({ provider: provider.name, method });

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      headers,
      body,
    });

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
    return normalized;
  } catch (err) {
    timer();
    requestCounter.inc({ provider: provider.name, method, status: "error" });

    const errorType = err.message.includes("HTTP") ? "http_error" : "rpc_error";
    errorCounter.inc({ provider: provider.name, error_type: errorType });

    throw err;
  }
}

// Health check endpoint
fastify.get("/health", async () => {
  const providers = getActiveProviders();
  return {
    status: "ok",
    providers: providers.map((p) => p.name),
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
  const providers = getActiveProviders();

  if (providers.length === 0) {
    return {
      jsonrpc: "2.0",
      id: request.body.id ?? null,
      error: { code: -32603, message: "No RPC providers configured" },
    };
  }

  let lastError;
  let previousProvider = null;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];

    try {
      const result = await makeRequest(provider, body, method);
      activeProvider.set(i + 1);
      fastify.log.info(
        { provider: provider.name, method },
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
    { providers: providers.map((p) => p.name) },
    "RPC proxy started",
  );
});
