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

const isoDateTimeSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Format waktu tidak valid.",
  });

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

export const createTodoSchema = z
  .object({
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
    starts_at: isoDateTimeSchema.optional().nullable(),
    ends_at: isoDateTimeSchema.optional().nullable(),
    /** undefined = default 1h before start; [] = no reminders */
    notify_reminder_at: z.array(isoDateTimeSchema).max(5).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ends_at && !data.starts_at) {
      ctx.addIssue({
        code: "custom",
        message: "Waktu selesai rencana membutuhkan waktu mulai.",
        path: ["ends_at"],
      });
    }
    if (data.starts_at && data.ends_at) {
      if (new Date(data.ends_at).getTime() <= new Date(data.starts_at).getTime()) {
        ctx.addIssue({
          code: "custom",
          message: "Waktu selesai rencana harus setelah waktu mulai.",
          path: ["ends_at"],
        });
      }
    }
    if (data.starts_at && data.notify_reminder_at) {
      const startMs = new Date(data.starts_at).getTime();
      for (const [index, reminder] of data.notify_reminder_at.entries()) {
        if (new Date(reminder).getTime() >= startMs) {
          ctx.addIssue({
            code: "custom",
            message: "Pengingat harus sebelum waktu mulai.",
            path: ["notify_reminder_at", index],
          });
        }
      }
    }
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
    starts_at: isoDateTimeSchema.nullable().optional(),
    ends_at: isoDateTimeSchema.nullable().optional(),
    notify_reminder_at: z.array(isoDateTimeSchema).max(5).nullable().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.project !== undefined ||
      data.status !== undefined ||
      data.tags !== undefined ||
      data.position !== undefined ||
      data.starts_at !== undefined ||
      data.ends_at !== undefined ||
      data.notify_reminder_at !== undefined,
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
  startsAt: string | null;
  endsAt: string | null;
  notifyReminderAt: string[];
  createdAt: string;
  updatedAt: string;
}
