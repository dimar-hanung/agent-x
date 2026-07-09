"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TodoStatus } from "@/lib/db/schema";
import {
  TODO_STATUS_LABELS,
  TODO_STATUS_ORDER,
} from "@/lib/todos/labels";

export const FILTER_ALL = "__all__" as const;
export const FILTER_NO_PROJECT = "__none__" as const;

export type ProjectFilterValue =
  | typeof FILTER_ALL
  | typeof FILTER_NO_PROJECT
  | string;

export type StatusFilterValue = typeof FILTER_ALL | TodoStatus;

export interface TodoFiltersState {
  query: string;
  project: ProjectFilterValue;
  status: StatusFilterValue;
}

interface TodoFiltersProps {
  projects: string[];
  value: TodoFiltersState;
  onChange: (next: TodoFiltersState) => void;
}

export function TodoFilters({ projects, value, onChange }: TodoFiltersProps) {
  const hasActiveFilter =
    value.query.trim() !== "" ||
    value.project !== FILTER_ALL ||
    value.status !== FILTER_ALL;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={value.query}
        onChange={(event) =>
          onChange({ ...value, query: event.target.value })
        }
        placeholder="Cari kode, judul, tag…"
        className="max-w-xs"
        aria-label="Cari todo"
      />

      <Select
        value={value.project}
        onValueChange={(project) =>
          onChange({ ...value, project: project as ProjectFilterValue })
        }
      >
        <SelectTrigger className="w-[180px]" aria-label="Filter project">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL}>Semua project</SelectItem>
          <SelectItem value={FILTER_NO_PROJECT}>Tanpa project</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project} value={project}>
              {project}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.status}
        onValueChange={(status) =>
          onChange({ ...value, status: status as StatusFilterValue })
        }
      >
        <SelectTrigger className="w-[180px]" aria-label="Filter status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTER_ALL}>Semua status</SelectItem>
          {TODO_STATUS_ORDER.map((status) => (
            <SelectItem key={status} value={status}>
              {TODO_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilter ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              query: "",
              project: FILTER_ALL,
              status: FILTER_ALL,
            })
          }
        >
          <XIcon />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
