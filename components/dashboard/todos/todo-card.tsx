"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TodoListItem } from "@/lib/todos/schemas";

interface TodoCardProps {
  todo: TodoListItem;
  onOpen: (todo: TodoListItem) => void;
}

export function TodoCard({ todo, onOpen }: TodoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: todo.id,
    data: { type: "todo", todo },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card touch-none rounded-md border p-3 shadow-xs",
        isDragging && "opacity-60 ring-2 ring-ring"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 space-y-0.5 text-left"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(todo);
          }}
        >
          <p className="text-muted-foreground font-mono text-[11px] tracking-wide">
            {todo.code}
          </p>
          <p className="text-sm font-medium leading-snug">{todo.title}</p>
          {todo.project ? (
            <p className="text-muted-foreground text-[11px]">{todo.project}</p>
          ) : null}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(todo);
          }}
          aria-label="Buka detail todo"
        >
          <ChevronRightIcon />
        </Button>
      </div>
      {todo.description ? (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
          {todo.description}
        </p>
      ) : null}
      {todo.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {todo.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
