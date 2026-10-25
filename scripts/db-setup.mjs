// Set up the Neon database: run migrations, load the medication catalog, and
// make sure the website's read-only role has a password and a connection URL.
//
//   pnpm db:setup
//
// Needs DATABASE_URL_ADMIN (the owner role) in .env.local. Writes DATABASE_URL
// (the read-only `lanternway_app` role) to .env.local the first time.
// Secrets are never printed.

import { Pool } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const adminUrl = process.env.DATABASE_URL_ADMIN;
if (!adminUrl) {
  console.error("DATABASE_URL_ADMIN is missing. Add it to .env.local.");
  process.exit(1);
}

const pool = new Pool({ connectionString: adminUrl });
const client = await pool.connect();

try {
  // 1. Migrations, in order. Each file is idempotent.
  const dir = join(root, "db/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await client.query(readFileSync(join(dir, file), "utf8"));
    console.log(`migrated  ${file}`);
  }

  // 2. Medication catalog: upsert every entry, remove ones no longer listed.
  const { medications } = JSON.parse(readFileSync(join(root, "db/seed/medication-catalog.json"), "utf8"));
  await client.query("begin");
  for (const m of medications) {
    const search = [m.generic, ...m.brands].join(" ").toLowerCase();
    await client.query(
      `insert into medication_catalog (generic_name, brand_names, drug_class, forms, search_text, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (generic_name) do update
         set brand_names = excluded.brand_names, drug_class = excluded.drug_class,
             forms = excluded.forms, search_text = excluded.search_text, updated_at = now()`,
      [m.generic, m.brands, m.class, m.forms, search],
    );
  }
  await client.query("delete from medication_catalog where source = 'lanternway-curated' and not (generic_name = any($1))", [
    medications.map((m) => m.generic),
  ]);
  await client.query("commit");
  const { rows } = await client.query("select count(*)::int as n from medication_catalog");
  console.log(`seeded    medication_catalog (${rows[0].n} medications)`);

  // 3. Read-only role for the website: set a password once and record its URL.
  const envPath = join(root, ".env.local");
  const env = readFileSync(envPath, "utf8");
  if (!/^DATABASE_URL=/m.test(env)) {
    const password = randomBytes(24).toString("base64url");
    await client.query(`alter role lanternway_app with login password '${password}'`);
    const url = new URL(adminUrl);
    url.username = "lanternway_app";
    url.password = password;
    writeFileSync(envPath, `${env.trimEnd()}\n# Neon read-only role for the website (select on medication_catalog only).\nDATABASE_URL=${url}\n`);
    console.log("role      lanternway_app password set; DATABASE_URL written to .env.local");
  } else {
    console.log("role      lanternway_app already configured (DATABASE_URL present)");
  }
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("Setup failed:", err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
