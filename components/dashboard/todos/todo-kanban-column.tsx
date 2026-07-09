"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { TodoCard } from "./todo-card";
import { formatTodoStatus } from "@/lib/todos/labels";
import type { TodoListItem } from "@/lib/todos/schemas";
import type { TodoStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface TodoKanbanColumnProps {
  status: TodoStatus;
  todos: TodoListItem[];
  onOpen: (todo: TodoListItem) => void;
}

export function TodoKanbanColumn({
  status,
  todos,
  onOpen,
}: TodoKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  const sorted = [...todos].sort((a, b) => a.position - b.position);

  return (
    <div
      className={cn(
        "bg-muted/40 flex min-h-[320px] flex-col rounded-lg border",
        isOver && "ring-ring ring-2"
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-medium">{formatTodoStatus(status)}</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {sorted.length}
        </span>
      </div>
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 p-2">
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
    </div>
  );
}
