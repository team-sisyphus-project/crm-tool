#!/usr/bin/env node
/**
 * Production server for the built single-page app.
 *
 * One process, one port, no framework: it serves the Vite build output as
 * static files and falls back to `index.html` for client-side routes so the
 * React Router history routes resolve on a hard refresh.
 *
 * Configuration is environment-only (no hardcoded port, no secrets):
 *   PORT        port to listen on                     (default 3000)
 *   HOST        interface to bind                     (default 0.0.0.0)
 *   STATIC_ROOT directory holding the build output    (default ./dist)
 *
 * Plain HTTP on purpose: TLS is terminated upstream, so this process must not
 * redirect to https.
 */
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";

const ROOT = resolve(process.env.STATIC_ROOT ?? "dist");
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const INDEX = join(ROOT, "index.html");

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const contentTypeOf = (filePath) =>
  CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";

/**
 * Only the content-hashed bundles under /assets/ are safe to cache forever.
 * Everything else (index.html, the service worker, the manifest) must be
 * revalidated so a redeploy is picked up immediately.
 */
const cacheControlOf = (urlPath) =>
  urlPath.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : "no-cache";

/** Map a URL path to a file inside ROOT, or null if it escapes ROOT. */
function toFilePath(urlPath) {
  const candidate = resolve(join(ROOT, decodeURIComponent(urlPath)));
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null;
  return candidate;
}

async function fileToServe(urlPath) {
  const candidate = toFilePath(urlPath);
  if (candidate === null) return null;

  const stats = await stat(candidate).catch(() => null);
  if (stats?.isFile()) return candidate;

  // Client-side route (no file extension) — let the SPA router handle it.
  // A missing asset stays a 404 so broken references remain visible.
  if (extname(candidate) === "") return INDEX;
  return null;
}

/**
 * The bundle is built with a relative base (`./assets/...`) so the same output
 * can also be hosted under a sub-path. Served from the SPA shell that base is
 * ambiguous: on a deep route such as /contacts/5/show the browser would look
 * for /contacts/5/assets/... . A single <base> element pins asset resolution
 * to the site root for every route.
 */
function withRootBase(html) {
  if (/<base\s/i.test(html)) return html;
  return html.replace(/<head(\s[^>]*)?>/i, (head) => `${head}<base href="/">`);
}

async function sendIndex(res, method) {
  const html = withRootBase(await readFile(INDEX, "utf8"));
  res.writeHead(200, {
    "Content-Type": CONTENT_TYPES[".html"],
    "Content-Length": Buffer.byteLength(html),
    "Cache-Control": "no-cache",
  });
  res.end(method === "HEAD" ? undefined : html);
}

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function handle(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return send(res, 405, "Method Not Allowed");
  }

  let urlPath;
  try {
    urlPath = new URL(req.url, "http://localhost").pathname;
  } catch {
    return send(res, 400, "Bad Request");
  }

  let filePath;
  try {
    filePath = await fileToServe(urlPath);
  } catch {
    // Malformed percent-encoding, or an unreadable path.
    return send(res, 400, "Bad Request");
  }
  if (filePath === null) return send(res, 404, "Not Found");
  if (filePath === INDEX) return sendIndex(res, req.method);

  res.writeHead(200, {
    "Content-Type": contentTypeOf(filePath),
    "Cache-Control": cacheControlOf(urlPath),
  });
  if (req.method === "HEAD") return res.end();

  const stream = createReadStream(filePath);
  stream.on("error", (error) => {
    console.error(`Failed to read ${filePath}:`, error);
    res.destroy();
  });
  stream.pipe(res);
}

createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(`Unhandled error for ${req.method} ${req.url}:`, error);
    if (!res.headersSent) send(res, 500, "Internal Server Error");
    else res.destroy();
  });
}).listen(PORT, HOST, () => {
  // process.stdout, not console.log: the repo's lint rule reserves console for
  // warn/error, and a startup banner belongs on stdout.
  process.stdout.write(`Serving ${ROOT} on http://${HOST}:${PORT}\n`);
});
