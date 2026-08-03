import cronstrue from "cronstrue/i18n";

const LOCALE = "id-ID";

export type ScheduleCronDisplayMode = "friendly" | "cron";

export function formatNextRunAt(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

export function formatCronExpressionFriendly(expression: string): string {
  try {
    return cronstrue.toString(expression, {
      locale: "id",
      use24HourTimeFormat: true,
    });
  } catch {
    return expression;
  }
}

export function formatCronExpressionDisplay(
  expression: string,
  mode: ScheduleCronDisplayMode
): string {
  if (mode === "cron") {
    return expression;
  }

  return formatCronExpressionFriendly(expression);
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
