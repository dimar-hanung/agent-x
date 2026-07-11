"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/todos/labels";

export interface TodoTimeFormValues {
  startsAtLocal: string;
  endsAtLocal: string;
  /** When true and starts set, omit notify_reminder_at so server applies 1h default */
  useDefaultReminder: boolean;
  /** Extra absolute reminder datetimes (local). Used when useDefaultReminder is false. */
  reminderLocals: string[];
}

export const EMPTY_TODO_TIME: TodoTimeFormValues = {
  startsAtLocal: "",
  endsAtLocal: "",
  useDefaultReminder: true,
  reminderLocals: [],
};

export function todoTimeFromItem(item: {
  startsAt: string | null;
  endsAt: string | null;
  notifyReminderAt: string[];
}): TodoTimeFormValues {
  const startsAtLocal = toDatetimeLocalValue(item.startsAt);
  let useDefaultReminder = true;
  let reminderLocals: string[] = [];

  if (!item.startsAt) {
    useDefaultReminder = true;
    reminderLocals = [];
  } else if (item.notifyReminderAt.length === 0) {
    useDefaultReminder = false;
    reminderLocals = [];
  } else {
    const startMs = new Date(item.startsAt).getTime();
    const onlyDefault =
      item.notifyReminderAt.length === 1 &&
      new Date(item.notifyReminderAt[0]).getTime() === startMs - 60 * 60 * 1000;
    if (onlyDefault) {
      useDefaultReminder = true;
      reminderLocals = [];
    } else {
      useDefaultReminder = false;
      reminderLocals = item.notifyReminderAt.map((iso) =>
        toDatetimeLocalValue(iso)
      );
    }
  }

  return {
    startsAtLocal,
    endsAtLocal: toDatetimeLocalValue(item.endsAt),
    useDefaultReminder,
    reminderLocals,
  };
}

export function buildTodoTimePayload(
  values: TodoTimeFormValues,
  mode: "create" | "update" = "create"
): {
  starts_at: string | null;
  ends_at: string | null;
  notify_reminder_at?: string[] | null;
} {
  const starts_at = fromDatetimeLocalValue(values.startsAtLocal);
  const ends_at = starts_at
    ? fromDatetimeLocalValue(values.endsAtLocal)
    : null;

  if (!starts_at) {
    return {
      starts_at: null,
      ends_at: null,
      notify_reminder_at: [],
    };
  }

  if (values.useDefaultReminder) {
    if (mode === "update") {
      return { starts_at, ends_at, notify_reminder_at: null };
    }
    return { starts_at, ends_at };
  }

  const notify_reminder_at = values.reminderLocals
    .map((local) => fromDatetimeLocalValue(local))
    .filter((iso): iso is string => Boolean(iso));

  return { starts_at, ends_at, notify_reminder_at };
}

interface TodoTimeFieldsProps {
  values: TodoTimeFormValues;
  disabled?: boolean;
  idPrefix?: string;
  onChange: (values: TodoTimeFormValues) => void;
}

export function TodoTimeFields({
  values,
  disabled,
  idPrefix = "todo-time",
  onChange,
}: TodoTimeFieldsProps) {
  function setPartial(patch: Partial<TodoTimeFormValues>) {
    onChange({ ...values, ...patch });
  }

  function applyDurationHours(hours: number) {
    if (!values.startsAtLocal) {
      return;
    }
    const startIso = fromDatetimeLocalValue(values.startsAtLocal);
    if (!startIso) {
      return;
    }
    const end = new Date(new Date(startIso).getTime() + hours * 60 * 60 * 1000);
    setPartial({ endsAtLocal: toDatetimeLocalValue(end.toISOString()) });
  }

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-starts`}>Mulai</FieldLabel>
        <Input
          id={`${idPrefix}-starts`}
          type="datetime-local"
          value={values.startsAtLocal}
          disabled={disabled}
          onChange={(event) => {
            const startsAtLocal = event.target.value;
            setPartial({
              startsAtLocal,
              endsAtLocal: startsAtLocal ? values.endsAtLocal : "",
              useDefaultReminder: startsAtLocal
                ? values.useDefaultReminder
                : true,
              reminderLocals: startsAtLocal ? values.reminderLocals : [],
            });
          }}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-ends`}>Selesai rencana</FieldLabel>
        <Input
          id={`${idPrefix}-ends`}
          type="datetime-local"
          value={values.endsAtLocal}
          disabled={disabled || !values.startsAtLocal}
          onChange={(event) => setPartial({ endsAtLocal: event.target.value })}
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || !values.startsAtLocal}
            onClick={() => applyDurationHours(1)}
          >
            +1 jam
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || !values.startsAtLocal}
            onClick={() => applyDurationHours(2)}
          >
            +2 jam
          </Button>
        </div>
      </Field>

      <Field>
        <FieldLabel>Pengingat</FieldLabel>
        {!values.startsAtLocal ? (
          <p className="text-muted-foreground text-xs">
            Isi waktu mulai untuk mengatur pengingat.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant={values.useDefaultReminder ? "default" : "outline"}
                disabled={disabled}
                onClick={() =>
                  setPartial({ useDefaultReminder: true, reminderLocals: [] })
                }
              >
                1 jam sebelum
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  !values.useDefaultReminder && values.reminderLocals.length === 0
                    ? "default"
                    : "outline"
                }
                disabled={disabled}
                onClick={() =>
                  setPartial({ useDefaultReminder: false, reminderLocals: [] })
                }
              >
                Tanpa pengingat
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() =>
                  setPartial({
                    useDefaultReminder: false,
                    reminderLocals: [...values.reminderLocals, ""],
                  })
                }
              >
                Tambah waktu
              </Button>
            </div>
            {!values.useDefaultReminder
              ? values.reminderLocals.map((local, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={local}
                      disabled={disabled}
                      onChange={(event) => {
                        const next = [...values.reminderLocals];
                        next[index] = event.target.value;
                        setPartial({ reminderLocals: next });
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() =>
                        setPartial({
                          reminderLocals: values.reminderLocals.filter(
                            (_, i) => i !== index
                          ),
                        })
                      }
                    >
                      Hapus
                    </Button>
                  </div>
                ))
              : (
                <p className="text-muted-foreground text-xs">
                  Default: pengingat 1 jam sebelum mulai.
                </p>
              )}
          </div>
        )}
      </Field>
    </div>
  );
}
