/**
 * Tests for the search_help_documentation tool
 */

import { test } from "node:test";
import assert from "node:assert";
import { execute } from "../../tools/search-help.js";
import { VectorStore, type DocumentChunk } from "../../store/vector-store.js";
import { EmbeddingsClient } from "../../embeddings/openai-client.js";

function makeChunk(id: string, text: string): DocumentChunk {
  return {
    id,
    url: `https://help.example.com/${id}`,
    title: `Page ${id}`,
    heading: `Section ${id}`,
    text,
    embedding: [1, 0, 0],
  };
}

function makeStore(chunks: DocumentChunk[]): VectorStore {
  const store = new VectorStore();
  store.setChunks(chunks, "test-model", "https://help.example.com");
  return store;
}

function makeMockEmbeddingsClient(): EmbeddingsClient {
  return {
    embed: async (_text: string) => [1, 0, 0],
    model: "test-model",
  } as unknown as EmbeddingsClient;
}

test("search_help_documentation returns formatted results", async () => {
  const store = makeStore([
    makeChunk("intro", "Introduction to Lawmaker"),
    makeChunk("workflow", "How to create a new document"),
  ]);
  const client = makeMockEmbeddingsClient();

  const result = await execute({ query: "getting started" }, store, client);

  assert.ok(!result.isError);
  assert.strictEqual(result.content[0].type, "text");
  assert.ok(result.content[0].text.includes("Result 1"));
  // Verify the URL of the first chunk appears in the formatted output
  assert.match(result.content[0].text, /\*\*URL:\*\* https:\/\/help\.example\.com\/intro/);
});

test("search_help_documentation returns empty result message for empty store", async () => {
  const store = new VectorStore();
  const client = makeMockEmbeddingsClient();

  const result = await execute({ query: "something" }, store, client);

  assert.ok(!result.isError);
  assert.ok(result.content[0].text.includes("No results found"));
});

test("search_help_documentation respects limit parameter", async () => {
  const chunks = Array.from({ length: 10 }, (_, i) =>
    makeChunk(`chunk-${i}`, `Content ${i}`)
  );
  const store = makeStore(chunks);
  const client = makeMockEmbeddingsClient();

  const result = await execute({ query: "content", limit: 3 }, store, client);

  // Count "Result N" occurrences
  const matches = result.content[0].text.match(/## Result \d+/g);
  assert.strictEqual(matches?.length, 3);
});

test("search_help_documentation caps limit at 20", async () => {
  const chunks = Array.from({ length: 25 }, (_, i) =>
    makeChunk(`chunk-${i}`, `Content ${i}`)
  );
  const store = makeStore(chunks);
  const client = makeMockEmbeddingsClient();

  const result = await execute({ query: "content", limit: 100 }, store, client);

  const matches = result.content[0].text.match(/## Result \d+/g);
  assert.ok(matches !== null && matches.length <= 20);
});

test("search_help_documentation handles embeddings error gracefully", async () => {
  const store = makeStore([makeChunk("x", "some text")]);
  const failingClient = {
    embed: async () => { throw new Error("API key invalid"); },
    model: "test-model",
  } as unknown as EmbeddingsClient;

  const result = await execute({ query: "test" }, store, failingClient);

  assert.strictEqual(result.isError, true);
  assert.ok(result.content[0].text.includes("Error searching documentation"));
});
