# Chatbot Setup Guide

The chatbot connects to two MCP servers over HTTP:

- **Legislation MCP** — searches and retrieves UK legislation from legislation.gov.uk
- **Lawmaker Help MCP** — searches the Lawmaker user manual via vector search

Both servers must be running before you start the chatbot.

---

## Prerequisites

1. **Node.js ≥ 18** installed.
2. An **OpenAI API key** — set `OPENAI_API_KEY` in a `.env` file or as an environment variable.
3. A built vector store for the Lawmaker Help MCP (see step 3 below).

---

## Step 1 — Build and start the Legislation MCP server

Open a terminal in the **repository root** and run:

```bash
npm install
npm run build
MCP_TRANSPORT=http PORT=3000 npm start
```

The server starts at `http://localhost:3000`. You should see:

```
UK Legislation MCP Server (HTTP mode)
Health check: http://localhost:3000/health
MCP endpoint: http://localhost:3000/mcp
```

Leave this terminal running.

---

## Step 2 — Build and start the Lawmaker Help MCP server

Open a **second terminal**, navigate to the `lawmaker-help-mcp` sub-directory, and run:

```bash
cd lawmaker-help-mcp
npm install
npm run build
```

If you have not already built the vector store, build it now (requires `OPENAI_API_KEY`):

```bash
OPENAI_API_KEY=<your-key> npm run build-index
```

Then start the server on port 3001:

```bash
MCP_TRANSPORT=http PORT=3001 OPENAI_API_KEY=<your-key> npm start
```

The server starts at `http://localhost:3001`. You should see:

```
Lawmaker Help MCP Server (HTTP mode)
Health check: http://localhost:3001/health
MCP endpoint: http://localhost:3001/mcp
```

Leave this terminal running.

---

## Step 3 — Start the chatbot

Open a **third terminal** in the **repository root** and run:

```bash
OPENAI_API_KEY=<your-key> npm run chat
```

Alternatively, create a `.env` file in the repository root:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Then simply run:

```bash
npm run chat
```

You should see:

```
Chatbot ready. Type 'exit' to quit.

You:
```

---

## Configuration

| Environment variable    | Default                        | Description                              |
|-------------------------|--------------------------------|------------------------------------------|
| `OPENAI_API_KEY`        | *(required)*                   | OpenAI API key                           |
| `OPENAI_MODEL`          | `gpt-4o-mini`                  | OpenAI model to use                      |
| `OPENAI_STREAM`         | `true`                         | Stream responses (`true`/`false`)        |
| `LEGISLATION_MCP_URL`   | `http://localhost:3000/mcp`    | URL of the Legislation MCP server        |
| `HELP_MCP_URL`          | `http://localhost:3001/mcp`    | URL of the Lawmaker Help MCP server      |
| `MCP_SHOW_TOOL_RESULTS` | `false`                        | Print raw tool results to the console    |
| `MCP_SHOW_RESOURCE_PREVIEW` | `false`                    | Print raw resource content to the console|

---

## How it works

The chatbot:

1. Connects to both MCP servers over HTTP using `StreamableHTTPClientTransport`.
2. Collects the full list of tools from both servers and combines them.
3. Sends the tool list plus your query to OpenAI.
4. When OpenAI requests a tool call, the chatbot routes it to whichever server registered that tool.
5. Resources (legislation documents) are served by the Legislation MCP server.
6. Returns the final answer to you.
