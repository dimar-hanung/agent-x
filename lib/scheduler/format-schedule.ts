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

export function formatScheduleStatus(
  status: "active" | "paused" | "completed" | "cancelled"
): string {
  switch (status) {
    case "active":
      return "Aktif";
    case "paused":
      return "Dijeda";
    case "completed":
      return "Selesai";
    case "cancelled":
      return "Dibatalkan";
  }
}
