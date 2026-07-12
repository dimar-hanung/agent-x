import { z } from "zod";

export const uploadFileInputSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .describe("File name including extension."),
    content: z
      .string()
      .optional()
      .describe("UTF-8 text content for notes, markdown, CSV, JSON, etc."),
    content_base64: z
      .string()
      .optional()
      .describe(
        "Base64-encoded binary content when the payload is not plain text."
      ),
    mime_type: z
      .string()
      .optional()
      .describe(
        "MIME type. Defaults to text/plain for content, application/octet-stream for content_base64."
      ),
    parent_id: z
      .string()
      .uuid()
      .nullable()
      .optional()
      .describe("Optional folder id. Omit or null for root."),
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

export type UploadFileInput = z.infer<typeof uploadFileInputSchema>;
