import { z } from "zod";

import { TODO_STATUSES, type TodoStatus } from "@/lib/db/schema";

export const todoStatuses = TODO_STATUSES;

const tagSchema = z
  .string()
  .trim()
  .min(1, "Tag tidak boleh kosong.")
  .max(64, "Tag maksimal 64 karakter.");

const projectSchema = z
  .string()
  .trim()
  .max(128, "Project maksimal 128 karakter.");

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function normalizeProject(
  project: string | null | undefined
): string | null | undefined {
  if (project === undefined) {
    return undefined;
  }
  if (project === null) {
    return null;
  }
  const trimmed = project.trim();
  return trimmed === "" ? null : trimmed;
}

export const createTodoSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi.").max(255),
  description: z
    .string()
    .trim()
    .max(5000, "Deskripsi maksimal 5000 karakter.")
    .optional()
    .nullable(),
  project: projectSchema.optional().nullable().transform(normalizeProject),
  status: z
    .enum(TODO_STATUSES, {
      error: "Status tidak valid.",
    })
    .optional()
    .default("todo"),
  tags: z
    .array(tagSchema)
    .max(20, "Maksimal 20 tag.")
    .optional()
    .default([])
    .transform(normalizeTags),
});

export const updateTodoSchema = z
  .object({
    title: z.string().trim().min(1, "Judul wajib diisi.").max(255).optional(),
    description: z
      .string()
      .trim()
      .max(5000, "Deskripsi maksimal 5000 karakter.")
      .nullable()
      .optional(),
    project: projectSchema.nullable().optional().transform(normalizeProject),
    status: z
      .enum(TODO_STATUSES, {
        error: "Status tidak valid.",
      })
      .optional(),
    tags: z
      .array(tagSchema)
      .max(20, "Maksimal 20 tag.")
      .optional()
      .transform((tags) => (tags === undefined ? undefined : normalizeTags(tags))),
    position: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.project !== undefined ||
      data.status !== undefined ||
      data.tags !== undefined ||
      data.position !== undefined,
    { message: "Minimal satu field harus diisi." }
  );

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;

export interface TodoListItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  project: string | null;
  status: TodoStatus;
  tags: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
}
