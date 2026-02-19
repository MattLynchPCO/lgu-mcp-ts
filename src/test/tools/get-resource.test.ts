/**
 * Tests for the get_resource tool
 */

import { test } from "node:test";
import assert from "node:assert";
import { execute } from "../../tools/get-resource.js";
import { ResourceLoader } from "../../resources/resource-loader.js";

// Minimal mock ResourceLoader
function makeLoader(resources: Record<string, string>): ResourceLoader {
  return {
    readResource(uri: string) {
      if (uri in resources) {
        return { uri, mimeType: "text/markdown", text: resources[uri] };
      }
      throw new Error(`Resource not found: ${uri}`);
    },
    listResources() { return []; },
  } as unknown as ResourceLoader;
}

test("get_resource returns content for a known URI", async () => {
  const loader = makeLoader({ "guide://getting-started": "# Getting Started\n\nWelcome." });
  const result = await execute({ uri: "guide://getting-started" }, loader);

  assert.strictEqual(result.content[0].type, "text");
  assert.ok(result.content[0].text.includes("Getting Started"));
  assert.strictEqual(result.isError, undefined);
});

test("get_resource returns error response for unknown URI", async () => {
  const loader = makeLoader({});
  const result = await execute({ uri: "guide://nonexistent" }, loader);

  assert.strictEqual(result.isError, true);
  assert.ok(result.content[0].text.includes("Resource not found"));
});
