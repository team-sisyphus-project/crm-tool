/**
 * Shared plumbing for the `db:migrate` / `db:seed` scripts.
 *
 * Design notes:
 *
 * - No new npm dependency. Adding a Postgres driver is a supply-chain decision
 *   (`.claude/rules/dependency-safety.md`), so these scripts shell out to `psql`,
 *   which every Postgres environment already ships.
 * - The ledger tables are the SAME ones the Supabase CLI uses
 *   (`supabase_migrations.schema_migrations` / `supabase_migrations.seed_files`),
 *   so `npm run db:migrate` and `npx supabase db push` agree on what is applied
 *   instead of each keeping a private bookkeeping table and double-applying.
 * - Every apply is wrapped in a single transaction together with its ledger
 *   write, so a failed file leaves neither schema nor ledger half-updated.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/** Thrown for every "we cannot proceed" condition; callers turn it into exit 1. */
export class DbError extends Error {}

/**
 * Informational output. process.stdout, not console.log: the repo's lint rule
 * reserves `console` for warn/error, and progress belongs on stdout.
 */
export function log(message) {
  process.stdout.write(`${message}\n`);
}

/** `psql` needs the URL as its dbname argument; these are its baseline flags. */
const PSQL_FLAGS = ["-v", "ON_ERROR_STOP=1", "--no-psqlrc"];

/** Trimmed `DATABASE_URL`, or `null` when it is unset or blank. */
export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  return url ? url : null;
}

/** True when a `psql` client is reachable on PATH. */
export function hasPsql() {
  return spawnSync("psql", ["--version"], { stdio: "ignore" }).status === 0;
}

function runPsql(url, args, input) {
  const result = spawnSync("psql", [url, ...PSQL_FLAGS, ...args], {
    input,
    encoding: "utf8",
  });
  if (result.error) {
    throw new DbError(`could not run psql: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new DbError((result.stderr || result.stdout || "").trim());
  }
  return result.stdout;
}

/** Run a query and return its output with tuples-only/unaligned formatting. */
export function query(url, sql) {
  return runPsql(url, ["-tA", "-c", sql], undefined).trim();
}

/**
 * Apply `sql` (plus any `extraSql` bookkeeping) as ONE transaction.
 * Passed on stdin so the caller controls exactly what the transaction contains.
 */
export function applySql(url, sql, extraSql = "") {
  runPsql(url, ["--single-transaction", "-f", "-"], `${sql}\n${extraSql}\n`);
}

/** Escape a value for a single-quoted SQL literal. */
export function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

/**
 * These migrations are Supabase-flavoured: they reference `auth.users`,
 * `storage.objects` and the `anon` / `authenticated` / `service_role` roles, and
 * they install extensions (`pg_net`, `pgjwt`, `http`) that a stock Postgres does
 * not ship. Applying them to a plain database cannot succeed, so we detect that
 * up front and skip with an explanation rather than failing halfway through.
 */
export function isSupabaseDatabase(url) {
  return query(url, "select to_regnamespace('auth') is not null") === "t";
}

/** Create the Supabase-CLI-compatible ledger schema and tables if absent. */
export function ensureLedger(url) {
  applySql(
    url,
    `create schema if not exists supabase_migrations;
     create table if not exists supabase_migrations.schema_migrations (
       version text primary key,
       statements text[],
       name text
     );
     create table if not exists supabase_migrations.seed_files (
       path text primary key,
       hash text not null
     );`,
  );
}

/** Read a UTF-8 file, or throw a DbError naming the missing path. */
export function readSqlFile(path) {
  if (!existsSync(path)) {
    throw new DbError(`SQL file not found: ${path}`);
  }
  return readFileSync(path, "utf8");
}

/**
 * Shared entry point: resolve the preconditions, then hand a live connection to
 * `run`. Returns the process exit code.
 *
 * `DATABASE_URL` unset is a deliberate no-op (exit 0) — a checkout without a
 * database must still build and boot. A set-but-unusable database is a real
 * failure and exits 1.
 */
export function withDatabase(label, run) {
  const url = getDatabaseUrl();
  if (!url) {
    log(`[${label}] DATABASE_URL is not set — nothing to do, skipping.`);
    return 0;
  }
  if (!hasPsql()) {
    console.error(
      `[${label}] DATABASE_URL is set but the \`psql\` client was not found on PATH.\n` +
        `[${label}] Install the PostgreSQL client tools, or unset DATABASE_URL to skip this step.`,
    );
    return 1;
  }
  try {
    if (!isSupabaseDatabase(url)) {
      log(
        `[${label}] Target database has no \`auth\` schema, so it is not a Supabase database.\n` +
          `[${label}] These SQL files require Supabase (auth/storage schemas, pg_net/pgjwt/http` +
          ` extensions), so there is nothing to apply here — skipping.\n` +
          `[${label}] Start a Supabase database first (see README, "Green-field database setup").`,
      );
      return 0;
    }
    ensureLedger(url);
    run(url);
    return 0;
  } catch (error) {
    if (error instanceof DbError) {
      console.error(`[${label}] ${error.message}`);
      return 1;
    }
    throw error;
  }
}
