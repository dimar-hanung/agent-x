import { cancelJob, scheduleJob } from "node-schedule";

export type ScheduleKind = "cron" | "once";

export interface ParsedScheduleInput {
  scheduleKind: ScheduleKind;
  cronExpression: string | null;
  timezone: string;
  runAt: Date | null;
}

const DEFAULT_TIMEZONE = "Asia/Jakarta";

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function parseRunAt(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Format waktu jadwal tidak valid.");
  }

  return date;
}

export function validateScheduleInput(input: {
  scheduleKind: ScheduleKind;
  cronExpression?: string | null;
  timezone?: string;
  runAt?: Date | string | null;
  fromDate?: Date;
}): ParsedScheduleInput {
  const timezone = input.timezone?.trim() || DEFAULT_TIMEZONE;

  if (!isValidTimezone(timezone)) {
    throw new Error("Timezone tidak valid.");
  }

  if (input.scheduleKind === "once") {
    const runAt = parseRunAt(input.runAt);

    if (!runAt) {
      throw new Error("Waktu jadwal sekali wajib diisi.");
    }

    const compareAt = input.fromDate ?? new Date();

    if (runAt.getTime() <= compareAt.getTime()) {
      throw new Error("Waktu jadwal harus di masa depan.");
    }

    return {
      scheduleKind: "once",
      cronExpression: null,
      timezone,
      runAt,
    };
  }

  const cronExpression = input.cronExpression?.trim();

  if (!cronExpression) {
    throw new Error("Ekspresi cron wajib diisi untuk jadwal berulang.");
  }

  const probe = scheduleJob(
    { rule: cronExpression, tz: timezone },
    () => undefined
  );

  if (!probe) {
    throw new Error("Ekspresi cron tidak valid.");
  }

  cancelJob(probe);

  return {
    scheduleKind: "cron",
    cronExpression,
    timezone,
    runAt: null,
  };
}

export function computeNextRunAt(
  input: ParsedScheduleInput & { fromDate?: Date }
): Date | null {
  if (input.scheduleKind === "once") {
    return input.runAt;
  }

  if (!input.cronExpression) {
    return null;
  }

  const probe = scheduleJob(
    { rule: input.cronExpression, tz: input.timezone },
    () => undefined
  );

  if (!probe) {
    return null;
  }

  const next = probe.nextInvocation();
  cancelJob(probe);

  return next;
}

export function buildNodeScheduleSpec(job: {
  scheduleKind: ScheduleKind;
  cronExpression: string | null;
  timezone: string;
  runAt: Date | null;
}) {
  if (job.scheduleKind === "once") {
    if (!job.runAt) {
      throw new Error("Waktu jadwal sekali tidak ditemukan.");
    }

    return job.runAt;
  }

  if (!job.cronExpression) {
    throw new Error("Ekspresi cron tidak ditemukan.");
  }

  return { rule: job.cronExpression, tz: job.timezone };
}
