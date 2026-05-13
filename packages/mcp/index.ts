#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const gateway =
  process.argv.find((a) => a.startsWith("--gateway="))?.split("=")[1] ??
  "https://tollgate-1.onrender.com";

// ---------------------------------------------------------------------------
// Tool definitions (tollgate_ prefixed for Claude Desktop namespace clarity)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "tollgate_list_services",
    description:
      "List paid x402 AI services on TollGate. Optional workspace filter: 0g, liquify, qie, arbitrum, mantle, eazo, berkeley, deepsurge.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workspace: {
          type: "string",
          description: "Filter by workspace id",
        },
      },
    },
  },
  {
    name: "tollgate_get_service",
    description:
      "Get details of one paid x402 service including price, network, and sample response.",
    inputSchema: {
      type: "object" as const,
      properties: {
        serviceId: { type: "string" },
      },
      required: ["serviceId"],
    },
  },
  {
    name: "tollgate_pay",
    description:
      "Pay for an x402 service and get the response. Returns data + receiptId. Agent autonomously pays without human intervention.",
    inputSchema: {
      type: "object" as const,
      properties: {
        serviceId: {
          type: "string",
          description: "Service ID to pay for",
        },
        agentId: {
          type: "string",
          description: "Agent making the call (for receipt + policy check)",
        },
        proof: {
          type: "object",
          description: "Optional payment proof. Omit for dev-bypass mode.",
        },
      },
      required: ["serviceId"],
    },
  },
  {
    name: "tollgate_list_receipts",
    description:
      "List settled payment receipts. Filter by workspace, serviceId, or agentId.",
    inputSchema: {
      type: "object" as const,
      properties: {
        workspace: { type: "string" },
        serviceId: { type: "string" },
        agentId: { type: "string" },
      },
    },
  },
  {
    name: "tollgate_agent_policy",
    description:
      "Get an agent's spend policy: daily limit, max-per-request, autopay status, allowlist, amount spent today.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: { type: "string" },
      },
      required: ["agentId"],
    },
  },
];

// ---------------------------------------------------------------------------
// stdio name → HTTP server tool name mapping
// ---------------------------------------------------------------------------

const HTTP_TOOL_NAME: Record<string, string> = {
  tollgate_list_services: "list_services",
  tollgate_get_service: "get_service",
  tollgate_pay: "pay_for_service",
  tollgate_list_receipts: "list_receipts",
  tollgate_agent_policy: "get_agent_policy",
};

// ---------------------------------------------------------------------------
// HTTP proxy helper
// ---------------------------------------------------------------------------

interface McpHttpResponse {
  result?: { content?: { type?: string; text?: string }[] };
  error?: { message: string };
}

async function callHttpMcp(
  tool: string,
  args: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${gateway}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from gateway: ${await res.text()}`);
  }

  const data = (await res.json()) as McpHttpResponse;

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result?.content?.[0]?.text ?? "{}";
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "tollgate-mcp-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: TOOLS,
}));

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const stdioName = request.params.name;
  const httpName = HTTP_TOOL_NAME[stdioName];

  if (!httpName) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: `Unknown tool: ${stdioName}` }),
        },
      ],
      isError: true,
    };
  }

  const args = (request.params.arguments ?? {}) as Record<string, unknown>;

  try {
    const text = await callHttpMcp(httpName, args);
    return {
      content: [{ type: "text", text }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: message }),
        },
      ],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
