import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import process from "node:process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function readStreamedResponse(response, handlers) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("OpenAI API response body is not readable.");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";
  let startedFinal = false;
  let displayMode = "unknown";
  const displayState = { trailingBackslash: false };

  const startFinalIfNeeded = () => {
    if (startedFinal) {
      return;
    }
    startedFinal = true;
    if (handlers?.onFinalStart) {
      handlers.onFinalStart();
    }
  };

  const resolveDisplayMode = () => {
    if (displayMode !== "unknown") {
      return null;
    }

    const trimmed = fullText.replace(/^[\s\uFEFF\xA0]+/, "");
    if (trimmed.startsWith("FINAL ")) {
      displayMode = "final";
      return { mode: "final", trimmed };
    }

    if (trimmed.startsWith("TOOL_CALL ") || trimmed.startsWith("RESOURCE_READ ")) {
      displayMode = "suppress";
      return { mode: "suppress" };
    }

    return null;
  };

  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      return false;
    }

    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") {
      return true;
    }

    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      return false;
    }

    const delta =
      typeof parsed.delta === "string"
        ? parsed.delta
        : typeof parsed.text === "string" && String(parsed.type || "").includes("delta")
          ? parsed.text
          : null;
    if (!delta) {
      return false;
    }

    fullText += delta;

    const resolved = resolveDisplayMode();
    if (resolved?.mode === "final") {
      startFinalIfNeeded();
      const printable = resolved.trimmed.slice("FINAL ".length);
      if (printable && handlers?.onFinalToken) {
        handlers.onFinalToken(decodeEscapedNewlines(printable, displayState));
      }
      return false;
    }

    if (resolved?.mode === "suppress") {
      return false;
    }

    if (displayMode === "final") {
      startFinalIfNeeded();
      if (handlers?.onFinalToken) {
        handlers.onFinalToken(decodeEscapedNewlines(delta, displayState));
      }
    }

    return false;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const isDone = handleLine(line);
      if (isDone) {
        if (displayState.trailingBackslash && handlers?.onFinalToken) {
          handlers.onFinalToken("\\");
          displayState.trailingBackslash = false;
        }
        if (handlers?.onFinalEnd) {
          handlers.onFinalEnd();
        }
        return fullText.trim();
      }
    }
  }

  if (buffer) {
    const isDone = handleLine(buffer);
    if (isDone) {
      if (displayState.trailingBackslash && handlers?.onFinalToken) {
        handlers.onFinalToken("\\");
        displayState.trailingBackslash = false;
      }
      if (handlers?.onFinalEnd) {
        handlers.onFinalEnd();
      }
      return fullText.trim();
    }
  }

  if (displayState.trailingBackslash && handlers?.onFinalToken) {
    handlers.onFinalToken("\\");
    displayState.trailingBackslash = false;
  }

  if (handlers?.onFinalEnd) {
    handlers.onFinalEnd();
  }

  return fullText.trim();
}

function decodeEscapedNewlines(chunk, state) {
  let text = chunk;
  if (state.trailingBackslash) {
    text = `\\${text}`;
    state.trailingBackslash = false;
  }

  let trailingCount = 0;
  for (let i = text.length - 1; i >= 0 && text[i] === "\\"; i -= 1) {
    trailingCount += 1;
  }

  if (trailingCount % 2 === 1) {
    state.trailingBackslash = true;
    text = text.slice(0, -1);
  }

  return text.replace(/\\n/g, "\n");
}

function formatOutputForDisplay(text) {
  return text.replace(/\\n/g, "\n");
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const outputs = Array.isArray(data?.output) ? data.output : [];
  for (const item of outputs) {
    if (item?.type !== "message") {
      continue;
    }
    const contents = Array.isArray(item?.content) ? item.content : [];
    for (const content of contents) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

async function callOpenAI(messages, model, streamState) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing. Set it in .env or environment variables.");
  }

  const stream = (process.env.OPENAI_STREAM || "true").toLowerCase() !== "false";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: messages,
      stream,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${body}`);
  }

  if (stream) {
    return readStreamedResponse(response, {
      onFinalStart: () => {
        streamState.printedFinal = true;
        process.stdout.write("Assistant: ");
      },
      onFinalToken: (token) => {
        process.stdout.write(token);
      },
      onFinalEnd: () => {
        process.stdout.write("\n\n");
      },
    });
  }

  const data = await response.json();
  const content = extractResponseText(data);
  if (!content) {
    throw new Error("OpenAI API returned no content.");
  }

  return content.trim();
}

function buildSystemPrompt(toolList) {
  return [
    "You are a helpful chatbot with access to MCP tools.",
    "Respond using exactly one of the following prefixes per message.",
    "For tool use, respond with: TOOL_CALL {\"name\": \"tool_name\", \"arguments\": { ... }}",
    "To read a resource, respond with: RESOURCE_READ {\"uri\": \"scheme://path\"}",
    "For final answers, respond with: FINAL your response text",
    "You may call tools multiple times before sending a FINAL response.",
    "Do not include extra text outside these formats.",
    "Available tools:",
    toolList,
  ].join("\n");
}

function extractJsonObject(text, startIndex) {
  const firstBrace = text.indexOf("{", startIndex);
  if (firstBrace === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(firstBrace, i + 1);
      }
    }
  }

  return null;
}

function parseAssistantResponse(text) {
  const trimmed = text.replace(/^[\s\uFEFF\xA0]+/, "");
  if (trimmed.startsWith("TOOL_CALL ")) {
    const jsonText = extractJsonObject(trimmed, "TOOL_CALL ".length);
    if (!jsonText) {
      throw new Error("Unable to parse TOOL_CALL payload.");
    }
    return { type: "tool", content: JSON.parse(jsonText) };
  }
  if (trimmed.startsWith("RESOURCE_READ ")) {
    const jsonText = extractJsonObject(trimmed, "RESOURCE_READ ".length);
    if (!jsonText) {
      throw new Error("Unable to parse RESOURCE_READ payload.");
    }
    return { type: "resource", content: JSON.parse(jsonText) };
  }
  if (trimmed.startsWith("FINAL ")) {
    return { type: "final", content: trimmed.slice("FINAL ".length).trim() };
  }
  const finalIndex = trimmed.indexOf("FINAL ");
  if (finalIndex !== -1) {
    return { type: "final", content: trimmed.slice(finalIndex + "FINAL ".length).trim() };
  }
  return { type: "final", content: text.trim() };
}

function formatToolArgs(args) {
  if (!args || Object.keys(args).length === 0) {
    return "  (no arguments)";
  }

  return Object.entries(args)
    .map(([key, value]) => {
      if (value === null || value === undefined) {
        return `  - ${key}: ${String(value)}`;
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `  - ${key}: ${value}`;
      }
      return `  - ${key}: ${JSON.stringify(value)}`;
    })
    .join("\n");
}

function shouldShowPreview(envKey, fallback = "false") {
  return (process.env[envKey] || fallback).toLowerCase() === "true";
}

async function main() {
  const envPath = path.resolve(process.cwd(), ".env");
  loadEnvFile(envPath);

  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const showResourcePreview = shouldShowPreview("MCP_SHOW_RESOURCE_PREVIEW");
  const showToolResults = shouldShowPreview("MCP_SHOW_TOOL_RESULTS");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["build/index.js"],
  });

  const client = new Client(
    { name: "mcp-chatbot", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  const { tools } = await client.listTools();
  const { resources } = await client.listResources();
  const toolList = tools
    .map((tool) => {
      const schema = tool.inputSchema ? JSON.stringify(tool.inputSchema) : "{}";
      const description = tool.description || "";
      return `- ${tool.name}: ${description}\n  schema: ${schema}`;
    })
    .join("\n");

  const resourceList = resources
    .map((resource) => {
      const description = resource.description || "";
      return `- ${resource.uri}: ${description}`;
    })
    .join("\n");

  const systemPrompt = [buildSystemPrompt(toolList), "Available resources:", resourceList].join("\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const messages = [{ role: "system", content: systemPrompt }];

  const ask = () =>
    new Promise((resolve) => {
      rl.question("You: ", (answer) => resolve(answer));
    });

  console.log("Chatbot ready. Type 'exit' to quit.\n");

  while (true) {
    const input = String(await ask()).trim();
    if (!input) {
      continue;
    }
    if (input.toLowerCase() === "exit") {
      break;
    }

    messages.push({ role: "user", content: input });

    const streamState = { printedFinal: false };
    let assistantText = await callOpenAI(messages, model, streamState);
    let parsed;
    const maxToolRounds = 20;
    let safety = 0;

    while (true) {
      safety += 1;
      if (safety > maxToolRounds) {
        console.log("Assistant: Tool loop exceeded safety limit.\n");
        messages.push({ role: "assistant", content: assistantText });
        break;
      }

      try {
        parsed = parseAssistantResponse(assistantText);
      } catch (error) {
        if (!streamState.printedFinal) {
          console.log(`Assistant: ${assistantText}\n`);
        }
        messages.push({ role: "assistant", content: assistantText });
        break;
      }

      if (parsed?.type === "tool" && parsed?.content?.name) {
        const toolName = parsed.content.name;
        const toolArgs = parsed.content.arguments || {};
        console.log(`Tool call: ${toolName}`);
        console.log("Arguments:");
        console.log(`${formatToolArgs(toolArgs)}\n`);
        const toolResult = await client.callTool({
          name: toolName,
          arguments: toolArgs,
        });

        if (showToolResults) {
          console.log("Tool result:");
          console.log(`${JSON.stringify(toolResult, null, 2)}\n`);
        }

        const toolMessage = JSON.stringify(toolResult);
        messages.push({ role: "assistant", content: assistantText });
        messages.push({ role: "user", content: `Tool result: ${toolMessage}` });

        streamState.printedFinal = false;
        assistantText = await callOpenAI(messages, model, streamState);
        continue;
      }

      if (parsed?.type === "resource" && parsed?.content?.uri) {
        const resourceUri = parsed.content.uri;
        console.log(`Resource read: ${resourceUri}\n`);
        const resourceResult = await client.readResource({ uri: resourceUri });

        if (showResourcePreview) {
          const preview = JSON.stringify(resourceResult, null, 2);
          console.log("Resource preview:");
          console.log(`${preview}\n`);
        }
        const resourceMessage = JSON.stringify(resourceResult);
        messages.push({ role: "assistant", content: assistantText });
        messages.push({ role: "user", content: `Resource result: ${resourceMessage}` });

        streamState.printedFinal = false;
        assistantText = await callOpenAI(messages, model, streamState);
        continue;
      }

      if (parsed?.type === "final") {
        if (!streamState.printedFinal) {
          console.log(`Assistant: ${formatOutputForDisplay(parsed.content)}\n`);
        }
        messages.push({ role: "assistant", content: assistantText });
        break;
      }

      if (!streamState.printedFinal) {
        console.log(`Assistant: ${formatOutputForDisplay(assistantText)}\n`);
      }
      messages.push({ role: "assistant", content: assistantText });
      break;
    }
  }

  rl.close();
  await client.close();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
