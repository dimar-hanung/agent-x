import { z } from "zod";

export const sendEmailInputSchema = z.object({
  to: z.string().email().describe("Recipient email address."),
  subject: z.string().min(1).describe("Email subject line."),
  body: z.string().min(1).describe("Email body content."),
  cc: z.string().email().optional().describe("Optional CC recipient."),
  bcc: z.string().email().optional().describe("Optional BCC recipient."),
  isHtml: z
    .boolean()
    .optional()
    .describe("Whether the body is HTML. Defaults to plain text."),
});

export type SendEmailInput = z.infer<typeof sendEmailInputSchema>;
