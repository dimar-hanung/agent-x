import { google } from "googleapis";

import { getGoogleOAuthClient } from "@/lib/google/oauth";
import { getValidAccessToken } from "@/lib/google/token";

async function getGmailClient(userId: string) {
  const accessToken = await getValidAccessToken(userId);

  if (!accessToken) {
    return null;
  }

  const auth = getGoogleOAuthClient();
  auth.setCredentials({ access_token: accessToken });

  return google.gmail({ version: "v1", auth });
}

function encodeRawMessage(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function headerValue(
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string
): string {
  return (
    headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ""
  );
}

function decodeBodyData(data?: string | null): string {
  if (!data) {
    return "";
  }

  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8"
  );
}

function extractBodies(payload: {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: Array<{
    mimeType?: string | null;
    body?: { data?: string | null } | null;
    parts?: unknown[];
  }> | null;
}): { textBody: string; htmlBody?: string } {
  if (!payload) {
    return { textBody: "" };
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return { textBody: decodeBodyData(payload.body.data).slice(0, 10000) };
  }

  if (payload.mimeType === "text/html" && payload.body?.data) {
    const htmlBody = decodeBodyData(payload.body.data);
    return {
      textBody: htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 10000),
      htmlBody: htmlBody.slice(0, 20000),
    };
  }

  let textBody = "";
  let htmlBody: string | undefined;

  for (const part of payload.parts ?? []) {
    const nested = extractBodies(part as typeof payload);

    if (!textBody && nested.textBody) {
      textBody = nested.textBody;
    }

    if (!htmlBody && nested.htmlBody) {
      htmlBody = nested.htmlBody;
    }
  }

  if (!textBody && payload.body?.data) {
    textBody = decodeBodyData(payload.body.data).slice(0, 10000);
  }

  return { textBody, htmlBody };
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  textBody: string;
  htmlBody?: string;
}

export async function sendGmailApiMessage(
  userId: string,
  input: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    isHtml?: boolean;
  }
): Promise<{ id: string; threadId: string } | null> {
  const gmail = await getGmailClient(userId);

  if (!gmail) {
    return null;
  }

  const contentType = input.isHtml
    ? "text/html; charset=utf-8"
    : "text/plain; charset=utf-8";

  const lines = [
    `To: ${input.to}`,
    input.cc ? `Cc: ${input.cc}` : null,
    input.bcc ? `Bcc: ${input.bcc}` : null,
    `Subject: ${input.subject}`,
    `Content-Type: ${contentType}`,
    "",
    input.body,
  ].filter((line): line is string => line !== null);

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeRawMessage(lines.join("\r\n")),
    },
  });

  return {
    id: response.data.id ?? "",
    threadId: response.data.threadId ?? "",
  };
}

function buildGmailQuery(options: {
  from?: string;
  subject?: string;
  unread?: boolean;
  since?: string;
}): string {
  const parts: string[] = [];

  if (options.from) {
    parts.push(`from:${options.from}`);
  }

  if (options.subject) {
    parts.push(`subject:(${options.subject})`);
  }

  if (options.unread) {
    parts.push("is:unread");
  }

  if (options.since) {
    const date = new Date(options.since);

    if (!Number.isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      parts.push(`after:${y}/${m}/${d}`);
    }
  }

  return parts.join(" ");
}

export async function searchGmailMessages(
  userId: string,
  options: {
    from?: string;
    subject?: string;
    unread?: boolean;
    since?: string;
    limit?: number;
  } = {}
): Promise<GmailMessageSummary[] | null> {
  const gmail = await getGmailClient(userId);

  if (!gmail) {
    return null;
  }

  const maxResults = Math.min(Math.max(options.limit ?? 10, 1), 25);
  const q = buildGmailQuery(options);

  const list = await gmail.users.messages.list({
    userId: "me",
    q: q || undefined,
    maxResults,
  });

  const ids = list.data.messages ?? [];
  const messages: GmailMessageSummary[] = [];

  for (const item of ids) {
    if (!item.id) {
      continue;
    }

    const full = await gmail.users.messages.get({
      userId: "me",
      id: item.id,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });

    const headers = full.data.payload?.headers;

    messages.push({
      id: item.id,
      threadId: full.data.threadId ?? item.threadId ?? "",
      from: headerValue(headers, "From"),
      subject: headerValue(headers, "Subject"),
      date: headerValue(headers, "Date"),
      snippet: full.data.snippet ?? "",
    });
  }

  return messages;
}

export async function readGmailMessage(
  userId: string,
  messageId: string
): Promise<GmailMessageDetail | null> {
  const gmail = await getGmailClient(userId);

  if (!gmail) {
    return null;
  }

  try {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    if (!full.data.id) {
      return null;
    }

    const headers = full.data.payload?.headers;
    const bodies = extractBodies(full.data.payload ?? {});

    return {
      id: full.data.id,
      threadId: full.data.threadId ?? "",
      from: headerValue(headers, "From"),
      to: headerValue(headers, "To"),
      subject: headerValue(headers, "Subject"),
      date: headerValue(headers, "Date"),
      textBody: bodies.textBody,
      htmlBody: bodies.htmlBody,
    };
  } catch (error) {
    const status =
      error && typeof error === "object" && "code" in error
        ? Number((error as { code?: number }).code)
        : undefined;

    if (status === 404) {
      return null;
    }

    throw error;
  }
}
