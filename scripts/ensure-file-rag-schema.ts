/**
 * Chats column for file Q&A (no pgvector required).
 *   npx tsx scripts/ensure-file-rag-schema.ts
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
    console.log("Menerapkan drizzle/0012_file_rag_docling.sql …");
    await runSqlFile(sql, "drizzle/0012_file_rag_docling.sql");
    console.log(
      "Selesai. Kolom chats.source_file_id siap. Muat ulang halaman Tanya isi file."
    );
    console.log(
      "Untuk indexing PDF/DOCX (pgvector), pasang extension lalu: npm run db:file-rag:vectors"
    );
  } catch (error) {
    console.error("Gagal:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

void main();
