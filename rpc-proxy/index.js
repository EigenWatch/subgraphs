const fastify = require("fastify")({ logger: true });

const RPC_GATEWAY_URL =
  process.env.RPC_GATEWAY_URL || "https://gateway.thebuidl.xyz/query";
const RPC_API_KEY = process.env.RPC_API_KEY;
const PORT = process.env.PORT || 3000;

if (!RPC_API_KEY) {
  console.error("RPC_API_KEY environment variable is required");
  process.exit(1);
}

fastify.get("/health", async () => ({ status: "ok" }));

fastify.post("/", async (request, reply) => {
  const body = JSON.stringify(request.body);

  const response = await fetch(RPC_GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": RPC_API_KEY,
    },
    body,
  });

  const data = await response.json();

  // Standard JSON-RPC 2.0 response — pass through
  if (data.jsonrpc === "2.0") {
    return data;
  }

  // Wrapped envelope format — normalize to JSON-RPC 2.0
  if (data.status === "success" && data.result !== undefined) {
    const id = request.body.id ?? null;
    return { jsonrpc: "2.0", id, result: data.result };
  }

  // Error from gateway
  if (data.error || data.status === "error") {
    const id = request.body.id ?? null;
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: data.message || "Gateway error" },
    };
  }

  // Unknown format — pass through and let Graph Node handle it
  return data;
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
