#!/usr/bin/env node

/**
 * CLI: build-index
 *
 * Crawls help.lawmaker.legislation.gov.uk, generates embeddings for each
 * content chunk, and saves the result as a vector store JSON file.
 *
 * Usage:
 *   node build/cli/build-index.js [options]
 *
 * Options:
 *   --base-url <url>      Base URL to crawl (default: https://help.lawmaker.legislation.gov.uk)
 *   --output <path>       Output file path (default: ./data/vector-store.json)
 *   --model <model>       OpenAI embedding model (default: text-embedding-3-small)
 *   --max-pages <n>       Maximum pages to crawl (default: 500)
 *   --delay <ms>          Delay between page fetches in ms (default: 200)
 *   --batch-size <n>      Embedding batch size (default: 100)
 *
 * Required environment variables:
 *   OPENAI_API_KEY        OpenAI API key for generating embeddings
 *   OPENAI_BASE_URL       (Optional) Custom OpenAI-compatible API base URL
 */

import { scrapeHelpSite } from "../scraper/help-scraper.js";
import { EmbeddingsClient } from "../embeddings/openai-client.js";
import { VectorStore, type DocumentChunk } from "../store/vector-store.js";
import { randomUUID } from "crypto";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      args[key] = value;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const baseUrl = args["base-url"] ?? "https://help.lawmaker.legislation.gov.uk";
  const outputPath = args["output"] ?? "./data/vector-store.json";
  const model = args["model"] ?? process.env.EMBEDDINGS_MODEL ?? "text-embedding-3-small";
  const maxPages = parseInt(args["max-pages"] ?? "500", 10);
  const delayMs = parseInt(args["delay"] ?? "200", 10);
  const batchSize = parseInt(args["batch-size"] ?? "100", 10);

  console.error("=== Lawmaker Help Index Builder ===");
  console.error(`Base URL:    ${baseUrl}`);
  console.error(`Output:      ${outputPath}`);
  console.error(`Model:       ${model}`);
  console.error(`Max pages:   ${maxPages}`);
  console.error(`Delay:       ${delayMs}ms`);
  console.error("");

  // Step 1: Crawl the help site
  console.error("Step 1: Crawling help site...");
  const pageChunks = await scrapeHelpSite({ baseUrl, maxPages, delayMs });
  console.error(`  Found ${pageChunks.length} content chunks across crawled pages.`);

  if (pageChunks.length === 0) {
    console.error("No content found. Check the base URL and network connectivity.");
    process.exit(1);
  }

  // Step 2: Generate embeddings
  console.error("\nStep 2: Generating embeddings...");
  let embeddingsClient: EmbeddingsClient;
  try {
    embeddingsClient = new EmbeddingsClient({ model });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error initialising embeddings client: ${error.message}`);
    }
    process.exit(1);
  }

  const texts = pageChunks.map((c) => `${c.title}\n${c.heading}\n${c.text}`.slice(0, 8000));
  let embeddings: number[][];
  try {
    embeddings = await embeddingsClient.embedBatch(texts, batchSize);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error generating embeddings: ${error.message}`);
    }
    process.exit(1);
  }
  console.error(`  Generated ${embeddings.length} embeddings.`);

  // Step 3: Build vector store
  console.error("\nStep 3: Building vector store...");
  const chunks: DocumentChunk[] = pageChunks.map((chunk, i) => ({
    id: randomUUID(),
    url: chunk.url,
    title: chunk.title,
    heading: chunk.heading,
    text: chunk.text,
    embedding: embeddings[i],
  }));

  const store = new VectorStore();
  store.setChunks(chunks, model, baseUrl);

  // Step 4: Save to disk
  store.save(outputPath);
  console.error(`\nDone. Saved ${store.size} chunks to ${outputPath}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
