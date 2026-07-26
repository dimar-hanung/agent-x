import { graphJson } from "@/lib/microsoft/graph-fetch";

const DEFAULT_TIMEZONE = "Asia/Jakarta";

interface GraphEvent {
  id?: string;
  subject?: string;
  body?: { content?: string };
  location?: { displayName?: string };
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  webLink?: string;
  showAs?: string;
}

interface GraphEventListResponse {
  value?: GraphEvent[];
}

export function defaultMicrosoftCalendarWindow(): {
  timeMin: string;
  timeMax: string;
} {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const start = new Date(`${ymd}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}

export interface MicrosoftCalendarEventSummary {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  htmlLink?: string;
  status?: string;
}

function mapEvent(event: GraphEvent): MicrosoftCalendarEventSummary {
  return {
    id: event.id ?? "",
    summary: event.subject ?? "(No title)",
    description: event.body?.content ?? undefined,
    location: event.location?.displayName ?? undefined,
    start: event.start?.dateTime ?? event.start?.date ?? "",
    end: event.end?.dateTime ?? event.end?.date ?? "",
    htmlLink: event.webLink ?? undefined,
    status: event.showAs ?? undefined,
  };
}

export async function listMicrosoftCalendarEvents(
  userId: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    query?: string;
  } = {}
): Promise<MicrosoftCalendarEventSummary[] | null> {
  const defaults = defaultMicrosoftCalendarWindow();
  const timeMin = options.timeMin ?? defaults.timeMin;
  const timeMax = options.timeMax ?? defaults.timeMax;
  const top = Math.min(Math.max(options.maxResults ?? 10, 1), 25);

  const params = new URLSearchParams({
    $top: String(top),
    $orderby: "start/dateTime",
    $select:
      "id,subject,body,location,start,end,webLink,showAs",
    startDateTime: timeMin,
    endDateTime: timeMax,
  });

  if (options.query?.trim()) {
    params.set("$filter", `contains(subject,'${options.query.trim().replace(/'/g, "''")}')`);
  }

  const data = await graphJson<GraphEventListResponse>(
    userId,
    `/me/calendarView?${params.toString()}`
  );

  if (!data) {
    return null;
  }

  return (data.value ?? []).map(mapEvent);
}

export async function createMicrosoftCalendarEvent(
  userId: string,
  input: {
    summary: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    timeZone?: string;
    attendees?: string[];
  }
): Promise<MicrosoftCalendarEventSummary | null> {
  const timeZone = input.timeZone ?? DEFAULT_TIMEZONE;
  const isAllDay = !input.start.includes("T");

  const event = await graphJson<GraphEvent>(userId, "/me/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: input.summary,
      body: input.description
        ? {
            contentType: "Text",
            content: input.description,
          }
        : undefined,
      location: input.location
        ? {
            displayName: input.location,
          }
        : undefined,
      start: isAllDay
        ? { date: input.start.slice(0, 10), timeZone }
        : { dateTime: input.start, timeZone },
      end: isAllDay
        ? { date: input.end.slice(0, 10), timeZone }
        : { dateTime: input.end, timeZone },
      attendees: input.attendees?.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      })),
    }),
  });

  if (!event) {
    return null;
  }

  return mapEvent(event);
}
