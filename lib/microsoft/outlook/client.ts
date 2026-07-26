import { graphFetch, graphJson } from "@/lib/microsoft/graph-fetch";

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  toRecipients?: Array<{
    emailAddress?: {
      name?: string;
      address?: string;
    };
  }>;
  body?: {
    contentType?: string;
    content?: string;
  };
}

interface GraphMessageListResponse {
  value?: GraphMessage[];
}

export interface OutlookMessageSummary {
  id: string;
  conversationId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export interface OutlookMessageDetail {
  id: string;
  conversationId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  textBody: string;
  htmlBody?: string;
}

function formatAddress(
  address?: { name?: string; address?: string }
): string {
  if (!address?.address) {
    return "";
  }

  if (address.name) {
    return `${address.name} <${address.address}>`;
  }

  return address.address;
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

function buildOutlookFilter(options: {
  from?: string;
  subject?: string;
  unread?: boolean;
  since?: string;
}): string {
  const parts: string[] = [];

  if (options.from) {
    parts.push(
      `contains(from/emailAddress/address,'${escapeODataString(options.from)}')`
    );
  }

  if (options.subject) {
    parts.push(
      `contains(subject,'${escapeODataString(options.subject)}')`
    );
  }

  if (options.unread) {
    parts.push("isRead eq false");
  }

  if (options.since) {
    const date = new Date(options.since);

    if (!Number.isNaN(date.getTime())) {
      parts.push(`receivedDateTime ge ${date.toISOString()}`);
    }
  }

  return parts.join(" and ");
}

function mapMessageSummary(message: GraphMessage): OutlookMessageSummary {
  return {
    id: message.id,
    conversationId: message.conversationId ?? "",
    from: formatAddress(message.from?.emailAddress),
    subject: message.subject ?? "",
    date: message.receivedDateTime ?? "",
    snippet: message.bodyPreview ?? "",
  };
}

export async function sendOutlookMessage(
  userId: string,
  input: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    isHtml?: boolean;
  }
): Promise<{ id: string; conversationId: string } | null> {
  const toRecipients = input.to
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .map((address) => ({
      emailAddress: { address },
    }));

  const ccRecipients = input.cc
    ? input.cc
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
        .map((address) => ({
          emailAddress: { address },
        }))
    : undefined;

  const bccRecipients = input.bcc
    ? input.bcc
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
        .map((address) => ({
          emailAddress: { address },
        }))
    : undefined;

  const response = await graphFetch(userId, "/me/sendMail", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: {
          contentType: input.isHtml ? "HTML" : "Text",
          content: input.body,
        },
        toRecipients,
        ccRecipients,
        bccRecipients,
      },
      saveToSentItems: true,
    }),
  });

  if (!response) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to send Outlook message.");
  }

  return {
    id: "",
    conversationId: "",
  };
}

export async function searchOutlookMessages(
  userId: string,
  options: {
    from?: string;
    subject?: string;
    unread?: boolean;
    since?: string;
    limit?: number;
  } = {}
): Promise<OutlookMessageSummary[] | null> {
  const top = Math.min(Math.max(options.limit ?? 10, 1), 25);
  const filter = buildOutlookFilter(options);
  const params = new URLSearchParams({
    $top: String(top),
    $orderby: "receivedDateTime desc",
    $select:
      "id,conversationId,subject,bodyPreview,receivedDateTime,from",
  });

  if (filter) {
    params.set("$filter", filter);
  }

  const data = await graphJson<GraphMessageListResponse>(
    userId,
    `/me/messages?${params.toString()}`
  );

  if (!data) {
    return null;
  }

  return (data.value ?? []).map(mapMessageSummary);
}

export async function readOutlookMessage(
  userId: string,
  messageId: string
): Promise<OutlookMessageDetail | null> {
  try {
    const message = await graphJson<GraphMessage>(
      userId,
      `/me/messages/${encodeURIComponent(messageId)}?$select=id,conversationId,subject,receivedDateTime,from,toRecipients,body`
    );

    if (!message) {
      return null;
    }

    const content = message.body?.content ?? "";
    const isHtml = message.body?.contentType?.toLowerCase() === "html";

    return {
      id: message.id,
      conversationId: message.conversationId ?? "",
      from: formatAddress(message.from?.emailAddress),
      to: (message.toRecipients ?? [])
        .map((recipient) => formatAddress(recipient.emailAddress))
        .filter(Boolean)
        .join(", "),
      subject: message.subject ?? "",
      date: message.receivedDateTime ?? "",
      textBody: isHtml
        ? content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 10000)
        : content.slice(0, 10000),
      htmlBody: isHtml ? content.slice(0, 20000) : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("404") || message.toLowerCase().includes("not found")) {
      return null;
    }

    throw error;
  }
}
