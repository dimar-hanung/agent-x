import { sql } from "drizzle-orm";

/** Format a float array for PostgreSQL pgvector literal. */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

/** SQL fragment for a vector column comparison (cosine distance). */
export function cosineDistance(columnName: string, embedding: number[]) {
  const literal = toVectorLiteral(embedding);
  return sql.raw(`${columnName} <=> '${literal}'::vector`);
}
