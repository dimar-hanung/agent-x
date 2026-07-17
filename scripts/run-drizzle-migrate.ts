import { resolve } from "node:path";

import { config } from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { drizzle } from "drizzle-orm/postgres-js";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error(
      "DATABASE_URL tidak ditemukan. Isi di .env.local atau .env lalu coba lagi."
    );
    process.exit(1);
  }

  const connection = postgres(url, { max: 1 });
  const db = drizzle(connection);

  try {
    console.log("Menjalankan migrasi Drizzle dari folder drizzle/ …");
    await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
    console.log("Migrasi selesai.");
  } catch (error) {
    console.error("Migrasi gagal:", error);
    console.error(
      "\nJika error terkait file RAG / source_file_id, coba: npm run db:file-rag"
    );
    process.exit(1);
  } finally {
    await connection.end();
  }
}

void main();
