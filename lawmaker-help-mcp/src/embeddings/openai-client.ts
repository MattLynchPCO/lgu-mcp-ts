/**
 * OpenAI embeddings client.
 *
 * Wraps the OpenAI API to generate dense vector embeddings for text chunks.
 * Configured via environment variables (set in .env file or system environment):
 *   OPENAI_API_KEY   — required
 *   OPENAI_BASE_URL  — optional, defaults to the OpenAI API
 *   EMBEDDINGS_MODEL — optional, defaults to text-embedding-3-small
 */

import OpenAI from "openai";

export const DEFAULT_MODEL = "text-embedding-3-small";

export interface EmbeddingsClientOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export class EmbeddingsClient {
  private client: OpenAI;
  readonly model: string;

  constructor(options: EmbeddingsClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY environment variable."
      );
    }
    const baseURL = options.baseURL ?? process.env.OPENAI_BASE_URL;
    this.model = options.model ?? process.env.EMBEDDINGS_MODEL ?? DEFAULT_MODEL;
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }

  /**
   * Generates an embedding vector for a single text string.
   */
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * Generates embedding vectors for a batch of texts.
   * Batches requests to stay within API limits.
   */
  async embedBatch(texts: string[], batchSize: number = 100): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });
      // Sort by index to preserve order
      const sorted = response.data.sort((a, b) => a.index - b.index);
      results.push(...sorted.map((d) => d.embedding));
    }
    return results;
  }
}
