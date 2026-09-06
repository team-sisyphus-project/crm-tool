#!/usr/bin/env node
/**
 * `npm run db:migrate` — apply `supabase/migrations/*.sql` to `DATABASE_URL`.
 *
 * Idempotent: every file already recorded in `supabase_migrations.schema_migrations`
 * is skipped, so re-running is a no-op. No-ops (exit 0) when DATABASE_URL is unset.
 * Override the source directory with MIGRATIONS_DIR (used by the tests).
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import {
  applySql,
  literal,
  log,
  query,
  readSqlFile,
  withDatabase,
} from "./lib/db.mjs";

const LABEL = "db:migrate";
const dir = process.env.MIGRATIONS_DIR || path.join("supabase", "migrations");

/** `20240730075029_init_db.sql` -> version `20240730075029`, name `init_db`. */
function parse(file) {
  const [, version = file.replace(/\.sql$/, ""), name = ""] =
    /^(\d+)_(.*)\.sql$/.exec(file) ?? [];
  return { file, version, name };
}

function listMigrations() {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map(parse);
}

function appliedVersions(url) {
  const rows = query(
    url,
    "select version from supabase_migrations.schema_migrations",
  );
  return new Set(rows ? rows.split("\n") : []);
}

process.exitCode = withDatabase(LABEL, (url) => {
  const applied = appliedVersions(url);
  const pending = listMigrations().filter(
    ({ version }) => !applied.has(version),
  );

  if (pending.length === 0) {
    log(`[${LABEL}] Database is up to date, no pending migrations.`);
    return;
  }

  for (const { file, version, name } of pending) {
    log(`[${LABEL}] Applying ${file}`);
    applySql(
      url,
      readSqlFile(path.join(dir, file)),
      `insert into supabase_migrations.schema_migrations (version, name)
       values (${literal(version)}, ${literal(name)})
       on conflict (version) do nothing;`,
    );
  }
  log(`[${LABEL}] Applied ${pending.length} migration(s).`);
});
