import { ImapFlow } from "imapflow";

import type { GmailCredentials } from "./types";

function createImapClient(credentials: GmailCredentials): ImapFlow {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: credentials.email,
      pass: credentials.appPassword,
    },
    logger: false,
  });
}

function extractBodiesFromSource(source: Buffer): {
  textBody: string;
  htmlBody?: string;
} {
  const raw = source.toString("utf8");
  const isHtml = /content-type:\s*text\/html/i.test(raw);
  const isMultipart = /content-type:\s*multipart/i.test(raw);
  const bodyStart = raw.indexOf("\r\n\r\n");

  if (bodyStart === -1) {
    return { textBody: raw.trim() };
  }

  const body = raw
    .slice(bodyStart + 4)
    .replace(/=\r?\n/g, "")
    .trim();

  if (isHtml && !isMultipart) {
    return { textBody: body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), htmlBody: body };
  }

  return { textBody: body.slice(0, 10000) };
}

export interface InboxMessageSummary {
  uid: number;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export interface SearchInboxOptions {
  from?: string;
  subject?: string;
  unread?: boolean;
  since?: string;
  limit?: number;
}

export async function searchInboxMessages(
  credentials: GmailCredentials,
  options: SearchInboxOptions = {}
): Promise<InboxMessageSummary[]> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
  const client = createImapClient(credentials);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const criteria: Record<string, unknown> = {};

      if (options.from) {
        criteria.from = options.from;
      }

      if (options.subject) {
        criteria.subject = options.subject;
      }

      if (options.unread) {
        criteria.seen = false;
      }

      if (options.since) {
        criteria.since = new Date(options.since);
      }

      const searchQuery =
        Object.keys(criteria).length > 0 ? criteria : { all: true };

      const uids = await client.search(searchQuery, { uid: true });

      if (!uids || uids.length === 0) {
        return [];
      }

      const selectedUids = uids.slice(-limit).reverse();
      const messages: InboxMessageSummary[] = [];

      for await (const message of client.fetch(
        selectedUids,
        {
          envelope: true,
          source: { start: 0, maxLength: 2048 },
        },
        { uid: true }
      )) {
        const from =
          message.envelope?.from?.[0]?.address ??
          message.envelope?.from?.[0]?.name ??
          "Unknown";
        const subject = message.envelope?.subject ?? "(no subject)";
        const date =
          message.envelope?.date?.toISOString() ?? new Date().toISOString();

        let snippet = "";

        if (message.source) {
          const { textBody } = extractBodiesFromSource(message.source);
          snippet = textBody.replace(/\s+/g, " ").trim().slice(0, 200);
        }

        messages.push({
          uid: message.uid,
          from,
          subject,
          date,
          snippet,
        });
      }

      return messages;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

export interface InboxMessageDetail {
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  textBody: string;
  htmlBody?: string;
}

export async function readInboxMessage(
  credentials: GmailCredentials,
  input: { uid: number }
): Promise<InboxMessageDetail | null> {
  const client = createImapClient(credentials);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      let found: InboxMessageDetail | null = null;

      for await (const message of client.fetch(
        { uid: input.uid },
        { envelope: true, source: true },
        { uid: true }
      )) {
        const from =
          message.envelope?.from?.[0]?.address ??
          message.envelope?.from?.[0]?.name ??
          "Unknown";
        const to =
          message.envelope?.to?.[0]?.address ??
          message.envelope?.to?.[0]?.name ??
          "Unknown";
        const subject = message.envelope?.subject ?? "(no subject)";
        const date =
          message.envelope?.date?.toISOString() ?? new Date().toISOString();

        const { textBody, htmlBody } = message.source
          ? extractBodiesFromSource(message.source)
          : { textBody: "" };

        found = {
          uid: message.uid,
          from,
          to,
          subject,
          date,
          textBody,
          htmlBody,
        };
      }

      return found;
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
