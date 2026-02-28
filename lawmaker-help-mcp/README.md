# Lawmaker Help MCP Server

Model Context Protocol (MCP) server providing AI assistants with vector search over the [Lawmaker user manual](https://help.lawmaker.legislation.gov.uk).

## Overview

This server crawls `help.lawmaker.legislation.gov.uk`, generates dense vector embeddings for each content chunk, and exposes a `search_help_documentation` tool that uses cosine similarity to find the most relevant documentation sections for a natural-language query.

## Quick Start

### 1. Install dependencies

```bash
npm install
npm run build
```

### 2. Build the vector index

The index must be built before the server can answer search queries. This crawls the help site, generates embeddings via the OpenAI API, and saves them locally.

```bash
export OPENAI_API_KEY=sk-...
npm run build-index
```

This saves the vector store to `./data/vector-store.json` by default.

### 3. Start the MCP server

```bash
OPENAI_API_KEY=sk-... npm start
```

## Tools

### `search_help_documentation`

Performs vector similarity search over the Lawmaker user manual.

**Input:**
- `query` (string, required) — natural language question or description
- `limit` (number, optional) — number of results to return (default: 5, max: 20)

**Output:** Formatted Markdown with the most relevant documentation sections, each including the page URL, title, section heading, text content, and similarity score.

## Configuration

| Environment variable  | Default                                   | Description                                        |
|-----------------------|-------------------------------------------|----------------------------------------------------|
| `OPENAI_API_KEY`      | *(required)*                              | OpenAI API key                                     |
| `OPENAI_BASE_URL`     | OpenAI default                            | Custom OpenAI-compatible API base URL              |
| `EMBEDDINGS_MODEL`    | `text-embedding-3-small`                  | Embedding model to use                             |
| `VECTOR_STORE_PATH`   | `./data/vector-store.json`                | Path to the pre-built vector store                 |
| `MCP_TRANSPORT`       | `stdio`                                   | Transport mode: `stdio` or `http`                  |
| `PORT`                | `3000`                                    | HTTP server port (when `MCP_TRANSPORT=http`)       |
| `MCP_SERVER_KEY`      | *(none)*                                  | Bearer token for HTTP transport authentication     |

## Build Index CLI

The `build-index` command accepts several options:

```
Options:
  --base-url <url>      Base URL to crawl (default: https://help.lawmaker.legislation.gov.uk)
  --output <path>       Output file path (default: ./data/vector-store.json)
  --model <model>       OpenAI embedding model (default: text-embedding-3-small)
  --max-pages <n>       Maximum pages to crawl (default: 500)
  --delay <ms>          Delay between page fetches in ms (default: 200)
  --batch-size <n>      Embedding batch size (default: 100)
```

Example — rebuild with a custom output path:

```bash
OPENAI_API_KEY=sk-... node build/cli/build-index.js \
  --output /data/lawmaker-vectors.json \
  --max-pages 200
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "lawmaker-help": {
      "command": "node",
      "args": ["/path/to/lawmaker-help-mcp/build/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "VECTOR_STORE_PATH": "/path/to/lawmaker-help-mcp/data/vector-store.json"
      }
    }
  }
}
```

## Development

```bash
# Build
npm run build

# Run tests
npm test

# Rebuild index
npm run build-index

# Inspect with MCP Inspector
npm run inspector

# HTTP mode
MCP_TRANSPORT=http OPENAI_API_KEY=sk-... npm start
```

## Architecture

```
src/
├── index.ts              Entry point (stdio / http transport selection)
├── server.ts             MCP server factory
├── cli/
│   └── build-index.ts    CLI tool to crawl the help site and build the vector store
├── embeddings/
│   └── openai-client.ts  OpenAI embeddings API client
├── scraper/
│   └── help-scraper.ts   HTML crawler for help.lawmaker.legislation.gov.uk
├── store/
│   └── vector-store.ts   File-based JSON vector store with cosine similarity
├── tools/
│   └── search-help.ts    search_help_documentation MCP tool
└── transports/
    └── http.ts           HTTP transport (Hono + WebStandard SSE)
```

The vector store is a plain JSON file containing all document chunks alongside their embedding vectors. At search time the query is embedded and cosine similarity is computed against all stored vectors to find the top-k most relevant chunks.

## License

Licensed under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
