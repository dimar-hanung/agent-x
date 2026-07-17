"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TodoStatus } from "@/lib/db/schema";
import {
  formatTodoStatus,
  TODO_STATUS_COLORS,
  TODO_STATUS_ORDER,
} from "@/lib/todos/labels";
import { cn } from "@/lib/utils";

interface TodoStatusSelectProps {
  value: TodoStatus;
  onValueChange: (status: TodoStatus) => void;
  disabled?: boolean;
  ariaLabel: string;
}

export function TodoStatusSelect({
  value,
  onValueChange,
  disabled,
  ariaLabel,
}: TodoStatusSelectProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== value) {
          onValueChange(next as TodoStatus);
        }
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn(
          "h-auto w-auto min-w-[7.5rem] border-transparent px-2 py-0.5 font-normal shadow-none",
          TODO_STATUS_COLORS[value].badge
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TODO_STATUS_ORDER.map((status) => (
          <SelectItem key={status} value={status}>
            {formatTodoStatus(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
