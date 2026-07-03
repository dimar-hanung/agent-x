import nodemailer from "nodemailer";

import type { GmailCredentials } from "./types";

function createSmtpTransport(credentials: GmailCredentials) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: credentials.email,
      pass: credentials.appPassword,
    },
  });
}

export async function verifyGmailConnection(
  credentials: GmailCredentials
): Promise<void> {
  const transport = createSmtpTransport(credentials);

  try {
    await transport.verify();
  } finally {
    transport.close();
  }
}

export interface SendGmailMessageInput {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  isHtml?: boolean;
}

export async function sendGmailMessage(
  credentials: GmailCredentials,
  input: SendGmailMessageInput
): Promise<{ messageId: string; accepted: string[] }> {
  const transport = createSmtpTransport(credentials);

  try {
    const info = await transport.sendMail({
      from: credentials.email,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      [input.isHtml ? "html" : "text"]: input.body,
    });

    return {
      messageId: info.messageId,
      accepted: (info.accepted as string[]) ?? [],
    };
  } finally {
    transport.close();
  }
}
