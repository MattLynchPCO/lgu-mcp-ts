/**
 * Tests for VectorStore
 */

import { test } from "node:test";
import assert from "node:assert";
import { VectorStore, type DocumentChunk } from "../../store/vector-store.js";

function makeChunk(id: string, embedding: number[]): DocumentChunk {
  return {
    id,
    url: `https://example.com/${id}`,
    title: `Page ${id}`,
    heading: `Section ${id}`,
    text: `Content for ${id}`,
    embedding,
  };
}

test("VectorStore.search returns top-k results sorted by cosine similarity", () => {
  const store = new VectorStore();

  // chunk A is very similar to query [1, 0, 0]
  const chunkA = makeChunk("a", [1, 0, 0]);
  // chunk B is somewhat similar
  const chunkB = makeChunk("b", [0.5, 0.5, 0]);
  // chunk C is orthogonal (dissimilar)
  const chunkC = makeChunk("c", [0, 1, 0]);

  store.setChunks([chunkA, chunkB, chunkC], "test-model", "https://example.com");

  const queryEmbedding = [1, 0, 0];
  const results = store.search(queryEmbedding, 3);

  assert.strictEqual(results.length, 3);
  assert.strictEqual(results[0].chunk.id, "a");
  assert.ok(results[0].score > results[1].score);
  assert.ok(results[1].score > results[2].score);
});

test("VectorStore.search respects topK limit", () => {
  const store = new VectorStore();
  const chunks = ["a", "b", "c", "d", "e"].map((id) =>
    makeChunk(id, [1, 0, 0])
  );
  store.setChunks(chunks, "test-model", "https://example.com");

  const results = store.search([1, 0, 0], 2);
  assert.strictEqual(results.length, 2);
});

test("VectorStore.search returns empty array for empty store", () => {
  const store = new VectorStore();
  const results = store.search([1, 0, 0], 5);
  assert.strictEqual(results.length, 0);
});

test("VectorStore.size reflects chunk count", () => {
  const store = new VectorStore();
  assert.strictEqual(store.size, 0);

  store.setChunks([makeChunk("x", [1, 0])], "model", "https://example.com");
  assert.strictEqual(store.size, 1);
});

test("VectorStore.upsertChunk adds new chunk", () => {
  const store = new VectorStore();
  store.upsertChunk(makeChunk("new", [0, 1, 0]));
  assert.strictEqual(store.size, 1);
});

test("VectorStore.upsertChunk updates existing chunk", () => {
  const store = new VectorStore();
  store.upsertChunk(makeChunk("x", [1, 0, 0]));
  store.upsertChunk({ ...makeChunk("x", [0, 1, 0]), text: "Updated" });
  assert.strictEqual(store.size, 1);
  const results = store.search([0, 1, 0], 1);
  assert.strictEqual(results[0].chunk.text, "Updated");
});

test("VectorStore search results do not include embedding field", () => {
  const store = new VectorStore();
  store.setChunks([makeChunk("a", [1, 0])], "model", "https://example.com");
  const results = store.search([1, 0], 1);
  assert.ok(!("embedding" in results[0].chunk));
});
