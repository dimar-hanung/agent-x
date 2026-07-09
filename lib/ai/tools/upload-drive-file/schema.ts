import { z } from "zod";

export const uploadDriveFileInputSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .describe("File name including extension when uploading a regular file."),
    content: z
      .string()
      .optional()
      .describe("UTF-8 text content. Use for notes, markdown, CSV, JSON, etc."),
    content_base64: z
      .string()
      .optional()
      .describe(
        "Base64-encoded binary content. Use when the payload is not plain text."
      ),
    mime_type: z
      .string()
      .optional()
      .describe(
        "MIME type of the uploaded bytes. Defaults to text/plain for content, application/octet-stream for content_base64."
      ),
    convert_to_google_doc: z
      .boolean()
      .optional()
      .describe(
        "If true, convert text upload into a Google Doc (application/vnd.google-apps.document)."
      ),
    parent_folder_id: z
      .string()
      .optional()
      .describe("Optional Drive folder id to upload into."),
  })
  .superRefine((value, ctx) => {
    const hasText = Boolean(value.content && value.content.length > 0);
    const hasBase64 = Boolean(
      value.content_base64 && value.content_base64.length > 0
    );

    if (!hasText && !hasBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide content or content_base64.",
        path: ["content"],
      });
    }

    if (hasText && hasBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide only one of content or content_base64.",
        path: ["content_base64"],
      });
    }
  });

export type UploadDriveFileInput = z.infer<typeof uploadDriveFileInputSchema>;
