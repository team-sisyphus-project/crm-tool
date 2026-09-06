#!/usr/bin/env node
/**
 * `npm run db:seed` — apply `supabase/seed.sql` to `DATABASE_URL`.
 *
 * Idempotent: the file's SHA-256 is recorded in `supabase_migrations.seed_files`
 * (the same ledger the Supabase CLI uses), so an unchanged seed is applied once
 * and skipped on every later run. No-ops (exit 0) when DATABASE_URL is unset.
 * Override the source file with SEED_FILE (used by the tests).
 */
import { createHash } from "node:crypto";
import path from "node:path";
import {
  applySql,
  literal,
  log,
  query,
  readSqlFile,
  withDatabase,
} from "./lib/db.mjs";

const LABEL = "db:seed";
const seedPath = process.env.SEED_FILE || path.join("supabase", "seed.sql");

process.exitCode = withDatabase(LABEL, (url) => {
  const sql = readSqlFile(seedPath);
  const hash = createHash("sha256").update(sql).digest("hex");
  const ledgerPath = seedPath.split(path.sep).join("/");

  const recorded = query(
    url,
    `select hash from supabase_migrations.seed_files where path = ${literal(ledgerPath)}`,
  );
  if (recorded === hash) {
    log(`[${LABEL}] ${ledgerPath} already applied (unchanged), skipping.`);
    return;
  }

  log(`[${LABEL}] Applying ${ledgerPath}`);
  applySql(
    url,
    sql,
    `insert into supabase_migrations.seed_files (path, hash)
     values (${literal(ledgerPath)}, ${literal(hash)})
     on conflict (path) do update set hash = excluded.hash;`,
  );
  log(`[${LABEL}] Seed applied.`);
});
