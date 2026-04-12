import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const baseUrl = (process.env.CHAMELEON_MEMORY_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const apiKey = process.env.CHAMELEON_MCP_API_KEY || "";
const agentId = process.env.CHAMELEON_AGENT_ID || "MARKETING";

if (!apiKey) {
  console.error("CHAMELEON_MCP_API_KEY is required");
  process.exit(1);
}

function buildHeaders() {
  return {
    "content-type": "application/json",
    "x-chameleon-api-key": apiKey,
    "x-agent": agentId,
  };
}

async function request(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }

  return payload;
}

function asText(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

const server = new McpServer({
  name: "chameleon-memory",
  version: "1.0.0",
});

server.registerTool("memory_write", {
  description: "Write data to Chameleon memory.",
  inputSchema: {
    sector: z.string(),
    key: z.string(),
    data: z.record(z.any()),
  },
}, async ({ sector, key, data }) => asText(
  await request("PUT", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}/${encodeURIComponent(key)}`, { data })
));

server.registerTool("memory_read", {
  description: "Read a single Chameleon memory entry.",
  inputSchema: {
    sector: z.string(),
    key: z.string(),
  },
}, async ({ sector, key }) => asText(
  await request("GET", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}/${encodeURIComponent(key)}`)
));

server.registerTool("memory_list", {
  description: "List keys in a Chameleon memory sector.",
  inputSchema: {
    sector: z.string(),
  },
}, async ({ sector }) => asText(
  await request("GET", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}`)
));

server.registerTool("memory_search", {
  description: "Search Chameleon memory by keyword.",
  inputSchema: {
    sector: z.string(),
    query: z.string(),
  },
}, async ({ sector, query }) => asText(
  await request("GET", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}/search/${encodeURIComponent(query)}`)
));

server.registerTool("memory_update", {
  description: "Patch a Chameleon memory entry.",
  inputSchema: {
    sector: z.string(),
    key: z.string(),
    patch: z.record(z.any()),
  },
}, async ({ sector, key, patch }) => asText(
  await request("PATCH", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}/${encodeURIComponent(key)}`, { patch })
));

server.registerTool("memory_delete", {
  description: "Delete a Chameleon memory entry.",
  inputSchema: {
    sector: z.string(),
    key: z.string(),
  },
}, async ({ sector, key }) => asText(
  await request("DELETE", `/api/chameleon-memory/memory/${encodeURIComponent(sector)}/${encodeURIComponent(key)}`)
));

server.registerTool("memory_health", {
  description: "Check Chameleon memory health.",
  inputSchema: {},
}, async () => asText(
  await request("GET", "/api/chameleon-memory/health")
));

server.registerTool("team_clock", {
  description: "Get Chameleon team clock and single-agent roster.",
  inputSchema: {},
}, async () => asText(
  await request("GET", "/api/chameleon-memory/clock")
));

server.registerTool("msg_send", {
  description: "Post a message to the Chameleon message board.",
  inputSchema: {
    sender: z.string(),
    tag: z.string(),
    content: z.string(),
    type: z.string().optional(),
    recipients: z.array(z.string()).optional(),
    priority: z.string().optional(),
    ref_id: z.string().optional(),
  },
}, async ({ sender, tag, content, type, recipients, priority, ref_id }) => asText(
  await request("POST", "/api/chameleon-memory/messages/send", { sender, tag, content, type, recipients, priority, ref_id })
));

server.registerTool("msg_poll", {
  description: "Poll Chameleon messages for an agent.",
  inputSchema: {
    agent: z.string(),
    channel: z.string().optional(),
    limit: z.number().optional(),
    use_cursor: z.boolean().optional(),
  },
}, async ({ agent, channel, limit, use_cursor }) => {
  const params = new URLSearchParams({ agent });
  if (channel) params.set("channel", channel);
  if (typeof limit === "number") params.set("limit", String(limit));
  if (typeof use_cursor === "boolean") params.set("use_cursor", String(use_cursor));
  return asText(await request("GET", `/api/chameleon-memory/messages/poll?${params.toString()}`));
});

server.registerTool("msg_mark_read", {
  description: "Advance a Chameleon message cursor.",
  inputSchema: {
    agent: z.string(),
    cursor_ts: z.string().optional(),
  },
}, async ({ agent, cursor_ts }) => asText(
  await request("POST", "/api/chameleon-memory/messages/cursor/advance", { agent, cursor_ts })
));

const transport = new StdioServerTransport();
await server.connect(transport);
