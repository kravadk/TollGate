/**
 * TollGate MCP stdio transport entry point.
 * Used by Claude Code and other MCP clients that connect via subprocess stdio.
 *
 * Usage (via .mcp.json): npx tsx src/mcp-stdio.ts
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, callTool } from "./mcp.js";

const server = new Server(
  { name: "tollgate", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const result = await callTool(
    req.params.name,
    (req.params.arguments ?? {}) as Record<string, unknown>,
  );
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
