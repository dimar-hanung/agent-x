import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ModelSettingsRowProps {
  title: string;
  description?: string;
  control: ReactNode;
  htmlFor?: string;
}

export function ModelSettingsRow({
  title,
  description,
  control,
  htmlFor,
}: ModelSettingsRowProps) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <label
          htmlFor={htmlFor}
          className="block font-medium leading-tight"
        >
          {title}
        </label>
        {description ? (
          <p className="text-muted-foreground mt-1 leading-snug">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center sm:justify-end">{control}</div>
    </div>
  );
}

interface ModelSettingsSectionProps {
  title: string;
}

export function ModelSettingsSection({ title }: ModelSettingsSectionProps) {
  return (
    <div className="bg-muted/40 border-border border-y px-4 py-2.5">
      <p className="text-muted-foreground font-medium">{title}</p>
    </div>
  );
}

interface ModelSettingsSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

export function ModelSettingsSwitch({
  checked,
  onCheckedChange,
  id,
  disabled = false,
}: ModelSettingsSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "focus-visible:ring-ring relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-emerald-500" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
