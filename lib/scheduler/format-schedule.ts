const LOCALE = "id-ID";

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

const FALLBACK_LABEL = "Jadwal berulang";

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

/** Human-readable Bahasa Indonesia label for a 5-field cron. Never returns the raw expression. */
export function formatCronExpression(cronExpression: string): string {
  const fields = cronExpression.trim().split(/\s+/);

  if (fields.length !== 5) {
    return FALLBACK_LABEL;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  if (month !== "*") {
    return FALLBACK_LABEL;
  }

  if (minute === "*" && hour === "*" && dayOfMonth === "*" && dayOfWeek === "*") {
    return "Setiap menit";
  }

  const everyMinute = parseStep(minute, 60);
  if (
    everyMinute !== null &&
    hour === "*" &&
    dayOfMonth === "*" &&
    dayOfWeek === "*"
  ) {
    return everyMinute === 1 ? "Setiap menit" : `Setiap ${everyMinute} menit`;
  }

  if (minute === "0" && dayOfMonth === "*" && dayOfWeek === "*") {
    const everyHour = parseStep(hour, 24);
    if (everyHour !== null) {
      return everyHour === 1 ? "Setiap jam" : `Setiap ${everyHour} jam`;
    }
  }

  const times = parseClockTimes(minute, hour);
  if (!times) {
    return FALLBACK_LABEL;
  }

  const timeLabel = formatTimes(times);
  const dayLabel = formatDayPart(dayOfMonth, dayOfWeek);

  if (!dayLabel) {
    return FALLBACK_LABEL;
  }

  return `${dayLabel} pukul ${timeLabel}`;
}

function parseStep(field: string, max: number): number | null {
  if (field === "*") {
    return 1;
  }

  const match = /^\*\/(\d+)$/.exec(field);
  if (!match) {
    return null;
  }

  const step = Number(match[1]);
  if (!Number.isInteger(step) || step < 1 || step >= max) {
    return null;
  }

  return step;
}

function parseClockTimes(
  minute: string,
  hour: string
): Array<{ hour: number; minute: number }> | null {
  const minutes = parseNumberList(minute, 0, 59);
  const hours = parseNumberList(hour, 0, 23);

  if (!minutes || !hours) {
    return null;
  }

  if (minutes.length === 1) {
    return hours.map((h) => ({ hour: h, minute: minutes[0]! }));
  }

  if (hours.length === 1) {
    return minutes.map((m) => ({ hour: hours[0]!, minute: m }));
  }

  return null;
}

function parseNumberList(
  field: string,
  min: number,
  max: number
): number[] | null {
  if (field.includes("/") || field === "*") {
    return null;
  }

  const values = new Set<number>();

  for (const part of field.split(",")) {
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < min ||
        end > max ||
        start > end
      ) {
        return null;
      }
      for (let i = start; i <= end; i++) {
        values.add(i);
      }
      continue;
    }

    if (!/^\d+$/.test(part)) {
      return null;
    }

    const value = Number(part);
    if (!Number.isInteger(value) || value < min || value > max) {
      return null;
    }
    values.add(value);
  }

  if (values.size === 0) {
    return null;
  }

  return [...values].sort((a, b) => a - b);
}

function formatTimes(times: Array<{ hour: number; minute: number }>): string {
  const labels = times.map(
    (t) =>
      `${String(t.hour).padStart(2, "0")}.${String(t.minute).padStart(2, "0")}`
  );

  if (labels.length === 1) {
    return labels[0]!;
  }

  if (labels.length === 2) {
    return `${labels[0]} dan ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, dan ${labels.at(-1)}`;
}

function formatDayPart(dayOfMonth: string, dayOfWeek: string): string | null {
  const hasDom = dayOfMonth !== "*";
  const hasDow = dayOfWeek !== "*";

  if (hasDom && hasDow) {
    return null;
  }

  if (!hasDom && !hasDow) {
    return "Setiap hari";
  }

  if (hasDom) {
    const days = parseNumberList(dayOfMonth, 1, 31);
    if (!days) {
      return null;
    }

    if (days.length === 1) {
      return `Setiap tanggal ${days[0]}`;
    }

    return `Setiap tanggal ${joinList(days.map(String))}`;
  }

  return formatWeekdays(dayOfWeek);
}

function formatWeekdays(field: string): string | null {
  const normalized = field.replace(/7/g, "0");
  const days = parseNumberList(normalized, 0, 6);
  if (!days) {
    return null;
  }

  const unique = [...new Set(days)].sort((a, b) => a - b);

  if (unique.length === 7) {
    return "Setiap hari";
  }

  if (sameSet(unique, [1, 2, 3, 4, 5])) {
    return "Hari kerja";
  }

  if (sameSet(unique, [0, 6])) {
    return "Akhir pekan";
  }

  const names = unique.map((d) => DAY_NAMES[d]!);

  if (names.length === 1) {
    return `Setiap ${names[0]}`;
  }

  return `Setiap ${joinList(names)}`;
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

function joinList(items: string[]): string {
  if (items.length === 1) {
    return items[0]!;
  }
  if (items.length === 2) {
    return `${items[0]} dan ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, dan ${items.at(-1)}`;
}
