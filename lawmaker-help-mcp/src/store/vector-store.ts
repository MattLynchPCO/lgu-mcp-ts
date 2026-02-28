/**
 * File-based vector store with cosine similarity search.
 *
 * Stores document chunks with their embeddings in a JSON file.
 * Loaded entirely into memory for fast search.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export interface DocumentChunk {
  id: string;
  url: string;
  title: string;
  heading: string;
  text: string;
  embedding: number[];
}

export interface VectorStoreData {
  version: number;
  created: string;
  model: string;
  baseUrl: string;
  chunks: DocumentChunk[];
}

export interface SearchResult {
  chunk: Omit<DocumentChunk, "embedding">;
  score: number;
}

/**
 * Computes cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export class VectorStore {
  private data: VectorStoreData;

  constructor(data?: VectorStoreData) {
    this.data = data ?? {
      version: 1,
      created: new Date().toISOString(),
      model: "",
      baseUrl: "",
      chunks: [],
    };
  }

  /**
   * Load a vector store from a JSON file.
   */
  static load(filePath: string): VectorStore {
    const raw = readFileSync(filePath, "utf-8");
    const data: VectorStoreData = JSON.parse(raw);
    return new VectorStore(data);
  }

  /**
   * Save the vector store to a JSON file.
   */
  save(filePath: string): void {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  /**
   * Replace all chunks (used when rebuilding the index).
   */
  setChunks(chunks: DocumentChunk[], model: string, baseUrl: string): void {
    this.data.chunks = chunks;
    this.data.model = model;
    this.data.baseUrl = baseUrl;
    this.data.created = new Date().toISOString();
  }

  /**
   * Add or update a single chunk.
   */
  upsertChunk(chunk: DocumentChunk): void {
    const idx = this.data.chunks.findIndex((c) => c.id === chunk.id);
    if (idx >= 0) {
      this.data.chunks[idx] = chunk;
    } else {
      this.data.chunks.push(chunk);
    }
  }

  /**
   * Search for the most similar chunks to a query embedding.
   */
  search(queryEmbedding: number[], topK: number = 5): SearchResult[] {
    const scored = this.data.chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(({ chunk, score }) => ({
      chunk: {
        id: chunk.id,
        url: chunk.url,
        title: chunk.title,
        heading: chunk.heading,
        text: chunk.text,
      },
      score,
    }));
  }

  /**
   * Returns total number of chunks in the store.
   */
  get size(): number {
    return this.data.chunks.length;
  }

  get model(): string {
    return this.data.model;
  }

  get baseUrl(): string {
    return this.data.baseUrl;
  }

  get created(): string {
    return this.data.created;
  }
}
