/**
 * Index tables + pgvector (butuh paket postgresql-*-pgvector di server).
 *   npm run db:file-rag:vectors
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function runSqlFile(sql: postgres.Sql, relativePath: string) {
  const path = resolve(process.cwd(), relativePath);
  const raw = readFileSync(path, "utf8");
  const statements = raw
    .split(/--> statement-breakpoint\n?/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.unsafe(statement);
  }
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL tidak ada. Set di .env.local atau .env.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });

  try {
    console.log("Menerapkan drizzle/0013_file_rag_vectors.sql …");
    await runSqlFile(sql, "drizzle/0013_file_rag_vectors.sql");
    console.log("Tabel indeks file + pgvector siap.");
  } catch (error) {
    console.error("Gagal:", error);
    console.error(
      "\nPasang pgvector di host PostgreSQL (contoh Ubuntu): sudo apt install postgresql-16-pgvector"
    );
    console.error("Lalu sebagai superuser: CREATE EXTENSION vector; pada database AgentX.");
    process.exit(1);
  } finally {
    await sql.end();
  }
}

void main();
