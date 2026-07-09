import { google } from "googleapis";

import { getGoogleOAuthClient } from "@/lib/google/oauth";
import { getValidAccessToken } from "@/lib/google/token";

const DEFAULT_TIMEZONE = "Asia/Jakarta";

async function getCalendarClient(userId: string) {
  const accessToken = await getValidAccessToken(userId);

  if (!accessToken) {
    return null;
  }

  const auth = getGoogleOAuthClient();
  auth.setCredentials({ access_token: accessToken });

  return google.calendar({ version: "v3", auth });
}

/** Calendar-day window in Asia/Jakarta (fixed UTC+7, no DST). */
export function defaultCalendarWindow(): {
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

export interface CalendarEventSummary {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  htmlLink?: string;
  status?: string;
  calendarId?: string;
}

export async function listCalendarEvents(
  userId: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    query?: string;
    calendarId?: string;
  } = {}
): Promise<CalendarEventSummary[] | null> {
  const calendar = await getCalendarClient(userId);

  if (!calendar) {
    return null;
  }

  const defaults = defaultCalendarWindow();
  const timeMin = options.timeMin ?? defaults.timeMin;
  const timeMax = options.timeMax ?? defaults.timeMax;
  const maxResults = Math.min(Math.max(options.maxResults ?? 10, 1), 25);
  const calendarId = options.calendarId ?? "primary";

  const response = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
    q: options.query,
  });

  return (response.data.items ?? []).map((event) => ({
    id: event.id ?? "",
    summary: event.summary ?? "(No title)",
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: event.start?.dateTime ?? event.start?.date ?? "",
    end: event.end?.dateTime ?? event.end?.date ?? "",
    htmlLink: event.htmlLink ?? undefined,
    status: event.status ?? undefined,
    calendarId,
  }));
}

export async function createCalendarEvent(
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
): Promise<CalendarEventSummary | null> {
  const calendar = await getCalendarClient(userId);

  if (!calendar) {
    return null;
  }

  const timeZone = input.timeZone ?? DEFAULT_TIMEZONE;
  const isAllDay = !input.start.includes("T");

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: isAllDay
        ? { date: input.start.slice(0, 10) }
        : { dateTime: input.start, timeZone },
      end: isAllDay
        ? { date: input.end.slice(0, 10) }
        : { dateTime: input.end, timeZone },
      attendees: input.attendees?.map((email) => ({ email })),
    },
  });

  const event = response.data;

  return {
    id: event.id ?? "",
    summary: event.summary ?? input.summary,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: event.start?.dateTime ?? event.start?.date ?? input.start,
    end: event.end?.dateTime ?? event.end?.date ?? input.end,
    htmlLink: event.htmlLink ?? undefined,
    status: event.status ?? undefined,
    calendarId: "primary",
  };
}
