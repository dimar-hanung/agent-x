/** Default early reminder offset before starts_at. */
export const DEFAULT_REMINDER_OFFSET_MS = 60 * 60 * 1000;

export const MAX_NOTIFY_REMINDERS = 5;

export function parseIsoDate(
  value: string | null | undefined,
  fieldLabel: string
): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldLabel} tidak valid.`);
  }
  return date;
}

export function normalizeReminderDates(
  reminders: Date[],
  startsAt: Date | null
): Date[] {
  const seen = new Set<number>();
  const result: Date[] = [];

  for (const date of reminders) {
    const key = date.getTime();
    if (seen.has(key)) continue;
    if (startsAt && key >= startsAt.getTime()) {
      throw new Error("Pengingat harus sebelum waktu mulai.");
    }
    seen.add(key);
    result.push(date);
  }

  result.sort((a, b) => a.getTime() - b.getTime());

  if (result.length > MAX_NOTIFY_REMINDERS) {
    throw new Error(`Maksimal ${MAX_NOTIFY_REMINDERS} pengingat.`);
  }

  return result;
}

/** Default: 1 hour before starts_at, skipped if that time is already past. */
export function defaultReminderAt(
  startsAt: Date,
  now: Date = new Date()
): Date[] {
  const reminder = new Date(startsAt.getTime() - DEFAULT_REMINDER_OFFSET_MS);
  if (reminder.getTime() <= now.getTime()) {
    return [];
  }
  return [reminder];
}

export function isDefaultOnlyReminders(
  reminders: Date[],
  startsAt: Date | null
): boolean {
  if (!startsAt || reminders.length !== 1) {
    return false;
  }
  const expected = startsAt.getTime() - DEFAULT_REMINDER_OFFSET_MS;
  return reminders[0].getTime() === expected;
}

export function resolveCreateTimeFields(input: {
  startsAt?: string | null;
  endsAt?: string | null;
  /** undefined = apply default; [] = no reminders; non-empty = explicit */
  notifyReminderAt?: string[] | null;
}): {
  startsAt: Date | null;
  endsAt: Date | null;
  notifyReminderAt: Date[];
} {
  const startsAt = parseIsoDate(input.startsAt ?? null, "Waktu mulai");
  const endsAt = parseIsoDate(input.endsAt ?? null, "Waktu selesai rencana");

  if (endsAt && !startsAt) {
    throw new Error("Waktu selesai rencana membutuhkan waktu mulai.");
  }

  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("Waktu selesai rencana harus setelah waktu mulai.");
  }

  if (!startsAt) {
    return { startsAt: null, endsAt: null, notifyReminderAt: [] };
  }

  let notifyReminderAt: Date[];

  if (input.notifyReminderAt === undefined || input.notifyReminderAt === null) {
    notifyReminderAt = defaultReminderAt(startsAt);
  } else {
    notifyReminderAt = normalizeReminderDates(
      input.notifyReminderAt.map((iso) => {
        const date = parseIsoDate(iso, "Pengingat");
        if (!date) {
          throw new Error("Pengingat tidak valid.");
        }
        return date;
      }),
      startsAt
    );
  }

  return { startsAt, endsAt, notifyReminderAt };
}

export function resolveUpdateTimeFields(input: {
  existingStartsAt: Date | null;
  existingEndsAt: Date | null;
  existingReminders: Date[];
  startsAt?: string | null;
  endsAt?: string | null;
  notifyReminderAt?: string[] | null;
}): {
  startsAt: Date | null;
  endsAt: Date | null;
  notifyReminderAt: Date[];
} | null {
  const touchesTime =
    input.startsAt !== undefined ||
    input.endsAt !== undefined ||
    input.notifyReminderAt !== undefined;

  if (!touchesTime) {
    return null;
  }

  let startsAt = input.existingStartsAt;
  let endsAt = input.existingEndsAt;
  let notifyReminderAt = [...input.existingReminders];

  if (input.startsAt !== undefined) {
    startsAt = parseIsoDate(input.startsAt, "Waktu mulai");
  }

  if (input.endsAt !== undefined) {
    endsAt = parseIsoDate(input.endsAt, "Waktu selesai rencana");
  }

  if (startsAt === null) {
    return { startsAt: null, endsAt: null, notifyReminderAt: [] };
  }

  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("Waktu selesai rencana harus setelah waktu mulai.");
  }

  if (input.notifyReminderAt !== undefined) {
    if (input.notifyReminderAt === null) {
      notifyReminderAt = defaultReminderAt(startsAt);
    } else {
      notifyReminderAt = normalizeReminderDates(
        input.notifyReminderAt.map((iso) => {
          const date = parseIsoDate(iso, "Pengingat");
          if (!date) {
            throw new Error("Pengingat tidak valid.");
          }
          return date;
        }),
        startsAt
      );
    }
  } else if (
    input.startsAt !== undefined &&
    isDefaultOnlyReminders(input.existingReminders, input.existingStartsAt)
  ) {
    notifyReminderAt = defaultReminderAt(startsAt);
  } else {
    notifyReminderAt = normalizeReminderDates(notifyReminderAt, startsAt);
  }

  return { startsAt, endsAt, notifyReminderAt };
}
