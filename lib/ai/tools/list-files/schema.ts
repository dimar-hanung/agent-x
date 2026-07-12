import { z } from "zod";

export const listFilesInputSchema = z.object({
  parent_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe(
      "Folder id to list. Omit or null for the user's storage root."
    ),
});

export type ListFilesInput = z.infer<typeof listFilesInputSchema>;
