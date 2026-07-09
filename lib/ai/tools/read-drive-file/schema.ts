import { z } from "zod";

export const readDriveFileInputSchema = z.object({
  file_id: z
    .string()
    .min(1)
    .describe("Google Drive file id from search_drive."),
});

export type ReadDriveFileInput = z.infer<typeof readDriveFileInputSchema>;
