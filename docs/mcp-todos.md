# MCP Todos Server

AgentX hosts a remote MCP server for todo CRUD. External clients (Cursor, Claude, etc.) authenticate with a personal API key.

## Setup

1. Sign in and open **Dashboard → Settings (Integrations)**.
2. Under **API Key / MCP**, click **Buat API key**, give it a name, and copy the key once (it is not shown again).
3. Point your MCP client at the Streamable HTTP endpoint with a Bearer header.

## Endpoint

```
{ORIGIN}/api/mcp/mcp
```

Example local: `http://localhost:8701/api/mcp/mcp`

Auth header:

```
Authorization: Bearer ax_<your_key>
```

## Client config examples

### Cursor / HTTP MCP

```json
{
  "mcpServers": {
    "agentx-todos": {
      "url": "http://localhost:8701/api/mcp/mcp",
      "headers": {
        "Authorization": "Bearer ax_YOUR_KEY"
      }
    }
  }
}
```

### stdio bridge (`mcp-remote`)

```json
{
  "mcpServers": {
    "agentx-todos": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:8701/api/mcp/mcp",
        "--header",
        "Authorization: Bearer ax_YOUR_KEY"
      ]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `list_todos` | List todos; optional `status`, `project` filters |
| `get_todo` | Get one todo by `id` (UUID) or `code` (e.g. `TODO-1`) |
| `create_todo` | Create todo (`title` required; `description`, `project`, `status`, `tags` optional) |
| `update_todo` | Update todo by `id` |
| `delete_todo` | Delete todo by `id` |

All tools are scoped to the API key owner. Keys are managed (create / revoke) on the Integrations page.

Tool results are returned as structured Bahasa Indonesia markdown with emoji (ringkasan status, grup per kolom, detail per todo) so clients can track progress easily.

## Security notes

- Keys are stored as SHA-256 hashes; plaintext is shown only at creation.
- Revoking a key immediately blocks MCP access for that key.
- Do not commit API keys to git or share them in chat logs.
