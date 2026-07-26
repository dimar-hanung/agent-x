import { z } from "zod";

export const readOnedriveFileInputSchema = z.object({
  file_id: z
    .string()
    .min(1)
    .describe("OneDrive file id from search_onedrive."),
});

export type ReadOnedriveFileInput = z.infer<typeof readOnedriveFileInputSchema>;
