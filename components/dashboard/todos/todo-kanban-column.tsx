"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDownIcon } from "lucide-react";

import { TodoCard } from "./todo-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatTodoStatus } from "@/lib/todos/labels";
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
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  const sorted = [...todos].sort((a, b) => a.position - b.position);
  const label = formatTodoStatus(status);
  const open = !collapsed;

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => {
        const shouldBeCollapsed = !nextOpen;
        if (shouldBeCollapsed !== collapsed) {
          onToggleCollapsed();
        }
      }}
      className={cn(
        "bg-muted/40 flex flex-col rounded-lg border",
        open ? "min-h-[320px]" : "min-h-0",
        isOver && "ring-ring ring-2"
      )}
    >
      <div
        ref={setNodeRef}
        className="flex min-h-0 flex-1 flex-col"
      >
        <CollapsibleTrigger
          type="button"
          className="hover:bg-muted/60 flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left transition-colors"
          aria-label={
            collapsed ? `Bentangkan kolom ${label}` : `Ciutkan kolom ${label}`
          }
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <ChevronDownIcon
              className={cn(
                "text-muted-foreground size-4 shrink-0 transition-transform",
                collapsed && "-rotate-90"
              )}
              aria-hidden
            />
            <h3 className="truncate text-sm font-medium">{label}</h3>
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {sorted.length}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-2 p-2">
            <SortableContext
              items={sorted.map((todo) => todo.id)}
              strategy={verticalListSortingStrategy}
            >
              {sorted.map((todo) => (
                <TodoCard key={todo.id} todo={todo} onOpen={onOpen} />
              ))}
            </SortableContext>
            {sorted.length === 0 ? (
              <p className="text-muted-foreground px-1 py-6 text-center text-xs">
                Kosong
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
