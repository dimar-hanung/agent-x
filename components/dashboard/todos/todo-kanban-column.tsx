"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { TodoCard } from "./todo-card";
import { formatTodoStatus, TODO_STATUS_COLORS } from "@/lib/todos/labels";
import type { TodoListItem } from "@/lib/todos/schemas";
import type { TodoStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface TodoKanbanColumnProps {
  status: TodoStatus;
  todos: TodoListItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpen: (todo: TodoListItem) => void;
}

export function TodoKanbanColumn({
  status,
  todos,
  collapsed,
  onToggleCollapsed,
  onOpen,
}: TodoKanbanColumnProps) {
  const { over } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  const sorted = [...todos].sort((a, b) => a.position - b.position);
  const label = formatTodoStatus(status);
  const colors = TODO_STATUS_COLORS[status];
  const isHighlighted =
    isOver ||
    over?.id === status ||
    (over != null && sorted.some((todo) => todo.id === over.id));

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "bg-muted/40 flex min-h-[320px] w-11 shrink-0 flex-col items-center rounded-lg border transition-[border-color,box-shadow] duration-200 ease-out",
          isHighlighted && "border-ring ring-ring ring-1 ring-inset"
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hover:bg-muted/60 flex w-full flex-1 flex-col items-center gap-3 px-1.5 py-2 transition-colors"
          aria-label={`Bentangkan kolom ${label}`}
          aria-expanded={false}
        >
          <ChevronRightIcon
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden
          />
          <span
            className={cn("size-1.5 shrink-0 rounded-full", colors.dot)}
            aria-hidden
          />
          <span
            className="text-muted-foreground flex-1 text-xs font-medium tracking-wide"
            style={{ writingMode: "vertical-rl" }}
          >
            {label}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {sorted.length}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-muted/40 flex min-h-[320px] min-w-0 flex-1 flex-col rounded-lg border transition-[border-color,box-shadow] duration-200 ease-out",
        isHighlighted && "border-ring ring-ring ring-1 ring-inset"
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="hover:bg-muted/60 flex w-full shrink-0 items-center justify-between gap-2 border-b px-3 py-2 text-left transition-colors"
        aria-label={`Ciutkan kolom ${label}`}
        aria-expanded={true}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <ChevronDownIcon
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden
          />
          <h3 className="inline-flex max-w-full items-center gap-2 truncate text-sm font-medium">
            <span
              className={cn("size-2 shrink-0 rounded-full", colors.dot)}
              aria-hidden
            />
            <span className="truncate">{label}</span>
          </h3>
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {sorted.length}
        </span>
      </button>

      <div
        ref={setNodeRef}
        className="flex min-h-0 flex-1 flex-col gap-2 p-2"
      >
        <SortableContext
          items={sorted.map((todo) => todo.id)}
          strategy={verticalListSortingStrategy}
        >
          {sorted.map((todo) => (
            <TodoCard key={todo.id} todo={todo} onOpen={onOpen} />
          ))}
        </SortableContext>
        {sorted.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center px-1 text-xs">
            Kosong
          </div>
        ) : null}
      </div>
    </div>
  );
}
