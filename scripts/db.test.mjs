/**
 * Black-box tests for `npm run db:migrate` / `npm run db:seed`.
 *
 * The scripts are spawned as real subprocesses so the assertions cover exactly
 * what the platform runs: the exit code, the message and the database state.
 *
 * The database-backed cases need a reachable Postgres the test user can create
 * databases on. Point TEST_DATABASE_URL at one, or rely on the local Unix
 * socket; when neither answers, those cases are skipped rather than failing.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const MIGRATE = path.join(scriptsDir, "db-migrate.mjs");
const SEED = path.join(scriptsDir, "db-seed.mjs");

/** Run one of the scripts with an explicit environment. */
function runScript(script, env = {}) {
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    // Start from a DATABASE_URL-free environment so the caller controls it.
    env: { ...process.env, DATABASE_URL: "", ...env },
  });
  return { ...result, output: `${result.stdout}${result.stderr}` };
}

const ADMIN_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql:///postgres?host=/var/run/postgresql";

function psqlAdmin(sql) {
  return spawnSync("psql", [ADMIN_URL, "-v", "ON_ERROR_STOP=1", "-tAc", sql], {
    encoding: "utf8",
  });
}

const postgresReachable = psqlAdmin("select 1").status === 0;

describe("without DATABASE_URL", () => {
  test("db:migrate exits 0 and says it is skipping", () => {
    const { status, output } = runScript(MIGRATE);
    expect(status).toBe(0);
    expect(output).toContain("DATABASE_URL is not set");
  });

  test("db:seed exits 0 and says it is skipping", () => {
    const { status, output } = runScript(SEED);
    expect(status).toBe(0);
    expect(output).toContain("DATABASE_URL is not set");
  });
});

describe.skipIf(!postgresReachable)("against a green-field database", () => {
  const dbName = `atomic_crm_db_test_${process.pid}`;
  const databaseUrl = ADMIN_URL.replace(
    /\/[^/?]*(\?|$)/,
    (_match, tail) => `/${dbName}${tail}`,
  );
  let fixtures;
  let migrationsDir;
  let seedFile;

  /** Query the scratch database and return the trimmed single-value result. */
  function value(sql) {
    const result = spawnSync(
      "psql",
      [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tAc", sql],
      { encoding: "utf8" },
    );
    expect(result.stderr).toBe("");
    return result.stdout.trim();
  }

  beforeAll(() => {
    expect(psqlAdmin(`drop database if exists ${dbName}`).status).toBe(0);
    expect(psqlAdmin(`create database ${dbName}`).status).toBe(0);

    fixtures = mkdtempSync(path.join(os.tmpdir(), "atomic-crm-db-"));
    // The seed lives OUTSIDE the migrations directory, mirroring the real
    // supabase/ layout — every .sql in the directory is treated as a migration.
    migrationsDir = path.join(fixtures, "migrations");
    seedFile = path.join(fixtures, "seed.sql");
    mkdirSync(migrationsDir);
    // Deliberately NOT `if not exists` / `on conflict`: a second apply of the
    // same file must fail loudly, which is what proves the skip logic works.
    writeFileSync(
      path.join(migrationsDir, "20260101000000_first.sql"),
      "create table public.widgets (id int primary key, label text);",
    );
    writeFileSync(
      path.join(migrationsDir, "20260101000001_second.sql"),
      "create table public.gadgets (id int primary key);",
    );
    writeFileSync(
      seedFile,
      "insert into public.widgets (id, label) values (1, 'first');",
    );
  });

  afterAll(() => {
    if (fixtures) psqlAdmin(`drop database if exists ${dbName}`);
  });

  test("skips a database that is not Supabase-flavoured", () => {
    const { status, output } = runScript(MIGRATE, {
      DATABASE_URL: databaseUrl,
      MIGRATIONS_DIR: migrationsDir,
    });
    expect(status).toBe(0);
    expect(output).toContain("not a Supabase database");
    expect(value("select to_regclass('public.widgets') is null")).toBe("t");
  });

  describe("once the Supabase schemas exist", () => {
    beforeAll(() => {
      expect(value("select 1")).toBe("1");
      spawnSync("psql", [databaseUrl, "-qc", "create schema auth"], {
        encoding: "utf8",
      });
    });

    test("db:migrate applies every pending migration", () => {
      const { status, output } = runScript(MIGRATE, {
        DATABASE_URL: databaseUrl,
        MIGRATIONS_DIR: migrationsDir,
      });
      expect(status).toBe(0);
      expect(output).toContain("Applied 2 migration(s)");
      expect(value("select to_regclass('public.widgets') is not null")).toBe(
        "t",
      );
      expect(value("select to_regclass('public.gadgets') is not null")).toBe(
        "t",
      );
      expect(
        value("select count(*) from supabase_migrations.schema_migrations"),
      ).toBe("2");
    });

    test("db:migrate is a no-op on a second run", () => {
      const { status, output } = runScript(MIGRATE, {
        DATABASE_URL: databaseUrl,
        MIGRATIONS_DIR: migrationsDir,
      });
      expect(status).toBe(0);
      expect(output).toContain("no pending migrations");
      expect(
        value("select count(*) from supabase_migrations.schema_migrations"),
      ).toBe("2");
    });

    test("db:seed inserts the seed data once", () => {
      const { status, output } = runScript(SEED, {
        DATABASE_URL: databaseUrl,
        SEED_FILE: seedFile,
      });
      expect(status).toBe(0);
      expect(output).toContain("Seed applied");
      expect(value("select count(*) from public.widgets")).toBe("1");
    });

    test("db:seed is a no-op on a second run", () => {
      const { status, output } = runScript(SEED, {
        DATABASE_URL: databaseUrl,
        SEED_FILE: seedFile,
      });
      expect(status).toBe(0);
      expect(output).toContain("already applied");
      expect(value("select count(*) from public.widgets")).toBe("1");
    });
  });
});

describe("with an unusable DATABASE_URL", () => {
  test("db:migrate fails loudly instead of pretending success", () => {
    const { status, output } = runScript(MIGRATE, {
      DATABASE_URL: "postgresql://nobody@127.0.0.1:1/nowhere",
    });
    expect(status).toBe(1);
    expect(output).toContain("[db:migrate]");
  });
});
