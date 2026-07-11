import { createHash } from "node:crypto";

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sorted: Record<string, unknown> = {};

  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortJsonValue((value as Record<string, unknown>)[key]);
  }

  return sorted;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

export function createQueryHash(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function normalizeOptionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeStringArray(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right));
}

export function compactObject<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    output[key] = value;
  }

  return output;
}