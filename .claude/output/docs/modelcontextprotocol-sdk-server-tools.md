# @modelcontextprotocol/sdk - Server Tools Registration

> Source: Web search + npm documentation (2025)

## Overview

The MCP TypeScript SDK enables building Model Context Protocol servers that expose tools, resources, and prompts to LLM clients.

## Import Paths

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
```

## Server Creation

```typescript
const server = new McpServer({
  name: "my-server",
  version: "1.0.0"
})
```

## Tool Registration (registerTool)

```typescript
server.registerTool(
  "tool_name",
  {
    title: "Tool Title",
    description: "What this tool does",
    inputSchema: {
      param1: z.string(),
      param2: z.number().optional()
    }
  },
  async ({ param1, param2 }) => ({
    content: [{ type: "text", text: "result" }]
  })
)
```

## Connect via stdio

```typescript
const transport = new StdioServerTransport()
await server.connect(transport)
```

## Full Example

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const server = new McpServer({ name: "demo-server", version: "1.0.0" })

server.registerTool("add", {
  title: "Addition Tool",
  description: "Add two numbers",
  inputSchema: { a: z.number(), b: z.number() }
}, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a + b) }]
}))

const transport = new StdioServerTransport()
await server.connect(transport)
```

## Notes

- inputSchema uses Zod schemas (not raw JSON Schema)
- SDK internally imports from zod/v4, compatible with zod v3.25+
- The `server.tool()` method also exists as an alias in some versions
- Return type: `{ content: Array<{ type: "text", text: string }> }`

## Sources

- [GitHub - modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [npm - @modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Build an MCP server - modelcontextprotocol.io](https://modelcontextprotocol.io/docs/develop/build-server)
