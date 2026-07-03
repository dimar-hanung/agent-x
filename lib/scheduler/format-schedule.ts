const LOCALE = "id-ID";

export function formatNextRunAt(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

export function formatScheduleKind(kind: "cron" | "once"): string {
  return kind === "once" ? "Sekali" : "Berulang";
}
