/**
 * Scraper for help.lawmaker.legislation.gov.uk
 *
 * Crawls all pages on the help site, extracts text content,
 * and splits content into chunks by section heading.
 */

export interface PageChunk {
  url: string;
  title: string;
  heading: string;
  text: string;
}

export interface ScraperOptions {
  baseUrl?: string;
  /** Maximum number of pages to crawl (for safety / rate-limiting). Default: 500 */
  maxPages?: number;
  /** Delay in milliseconds between requests. Default: 200 */
  delayMs?: number;
}

const DEFAULT_BASE_URL = "https://help.lawmaker.legislation.gov.uk";

/**
 * Strips HTML tags from a string, collapses whitespace, and trims.
 */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&") // Apply last to avoid double-unescaping &amp;lt; → &lt; → <
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts the page title from an HTML document.
 */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (match) {
    return stripTags(match[1]);
  }
  return "";
}

/**
 * Extracts all internal links from an HTML page.
 * Returns fully-qualified URLs within the same origin.
 */
function extractLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const links: string[] = [];
  const pattern = /href="([^"#?]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    try {
      const href = match[1];
      const url = new URL(href, base.origin);
      // Only follow links on the same host
      if (url.hostname === base.hostname) {
        links.push(url.href.replace(/\/$/, "")); // strip trailing slash
      }
    } catch {
      // Invalid URL — skip
    }
  }
  return [...new Set(links)];
}

/**
 * Extracts the main content area from an HTML page.
 * Tries common content container selectors.
 */
function extractMainContent(html: string): string {
  // Try to extract main content region (article, main, .content, etc.)
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1].trim().length > 100) {
      return match[1];
    }
  }
  // Fall back to body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

/**
 * Splits HTML content into chunks by heading (h1–h4).
 * Returns an array of { heading, text } pairs.
 */
function splitIntoChunks(
  html: string
): { heading: string; text: string }[] {
  // Split on heading tags
  const parts = html.split(/(?=<h[1-4][^>]*>)/i);
  const chunks: { heading: string; text: string }[] = [];

  for (const part of parts) {
    const headingMatch = part.match(/^<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
    const heading = headingMatch ? stripTags(headingMatch[1]) : "";
    const text = stripTags(part);
    if (text.length > 30) {
      chunks.push({ heading, text });
    }
  }

  return chunks;
}

/**
 * Fetches a URL and returns the response body as text.
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "lawmaker-help-mcp/0.1.0 (index builder; help.lawmaker.legislation.gov.uk)",
        Accept: "text/html",
      },
    });
    if (!response.ok) return null;
    const ct = response.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Crawls the help site and returns all content chunks.
 */
export async function scrapeHelpSite(
  options: ScraperOptions = {}
): Promise<PageChunk[]> {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const maxPages = options.maxPages ?? 500;
  const delayMs = options.delayMs ?? 200;

  const visited = new Set<string>();
  const queue: string[] = [baseUrl];
  const allChunks: PageChunk[] = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    process.stderr.write(`  Fetching [${visited.size}/${maxPages}]: ${url}\n`);

    const html = await fetchPage(url);
    if (!html) continue;

    const title = extractTitle(html);
    const mainContent = extractMainContent(html);
    const chunks = splitIntoChunks(mainContent);

    for (const { heading, text } of chunks) {
      if (text.trim().length > 30) {
        allChunks.push({ url, title, heading, text });
      }
    }

    // Discover new links
    const links = extractLinks(html, baseUrl);
    for (const link of links) {
      if (!visited.has(link) && !queue.includes(link)) {
        queue.push(link);
      }
    }

    // Be polite — rate limit requests
    if (delayMs > 0 && queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return allChunks;
}
