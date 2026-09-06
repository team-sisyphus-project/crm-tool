import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SERVER = fileURLToPath(new URL("./server.mjs", import.meta.url));
const INDEX_HTML =
  "<!doctype html><html><head><title>CRM</title></head>" +
  '<body><div id="root"></div><script src="./assets/index-abc123.js"></script></body></html>';
const BUNDLE_JS = "console.log('bundle');";

/** Ask the OS for a port that is currently free. */
const freePort = () =>
  new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });

/** Resolve once the server prints its listening banner. */
const waitForListening = (child) =>
  new Promise((resolveReady, reject) => {
    const timer = setTimeout(
      () => reject(new Error("server did not start in time")),
      10000,
    );
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (chunk.includes("Serving ")) {
        clearTimeout(timer);
        resolveReady();
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early with code ${code}`));
    });
  });

describe("server.mjs", () => {
  let root;
  let child;
  let baseUrl;

  beforeAll(async () => {
    // Arrange: a green-field build output, so the test needs no real build.
    root = await mkdtemp(join(tmpdir(), "atomic-crm-server-"));
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), INDEX_HTML);
    await writeFile(join(root, "assets", "index-abc123.js"), BUNDLE_JS);
    await writeFile(join(root, "sw.js"), BUNDLE_JS);

    const port = await freePort();
    baseUrl = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [SERVER], {
      env: { ...process.env, PORT: String(port), STATIC_ROOT: root },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitForListening(child);
  });

  afterAll(async () => {
    child?.kill();
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("serves the app HTML with 200 on the port given by PORT", async () => {
    const response = await fetch(`${baseUrl}/`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain('<div id="root">');
  });

  it("falls back to index.html for a client-side route", async () => {
    const response = await fetch(`${baseUrl}/contacts/5/show`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<div id="root">');
  });

  it("pins asset resolution to the site root on a deep route", async () => {
    const response = await fetch(`${baseUrl}/contacts/5/show`);

    expect(await response.text()).toContain('<base href="/">');
  });

  it("serves a built asset with its own content type", async () => {
    const response = await fetch(`${baseUrl}/assets/index-abc123.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/javascript");
    expect(await response.text()).toBe(BUNDLE_JS);
  });

  it("answers plain HTTP without redirecting to https", async () => {
    const response = await fetch(`${baseUrl}/`, { redirect: "manual" });

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("returns 404 for a missing asset instead of the SPA shell", async () => {
    const response = await fetch(`${baseUrl}/assets/missing.js`);

    expect(response.status).toBe(404);
  });

  it("refuses to serve files outside the static root", async () => {
    // Percent-encoded so the client does not normalize the ".." away.
    const response = await fetch(`${baseUrl}/%2e%2e/package.json`, {
      redirect: "manual",
    });

    expect(response.status).not.toBe(200);
    expect(await response.text()).not.toContain("atomic-crm");
  });

  it("revalidates the shell but caches hashed assets immutably", async () => {
    const [shell, asset] = await Promise.all([
      fetch(`${baseUrl}/`),
      fetch(`${baseUrl}/assets/index-abc123.js`),
    ]);

    expect(shell.headers.get("cache-control")).toBe("no-cache");
    expect(asset.headers.get("cache-control")).toContain("immutable");
  });
});
