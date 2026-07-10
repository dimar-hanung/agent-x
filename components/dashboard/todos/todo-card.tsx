"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TodoListItem } from "@/lib/todos/schemas";

interface TodoCardProps {
  todo: TodoListItem;
  onOpen: (todo: TodoListItem) => void;
}

interface TodoCardFaceProps {
  todo: TodoListItem;
  className?: string;
  style?: CSSProperties;
  showChevron?: boolean;
}

export function TodoCardFace({
  todo,
  className,
  style,
  showChevron = true,
}: TodoCardFaceProps) {
  return (
    <div
      style={style}
      className={cn(
        "bg-card rounded-md border p-3 shadow-xs",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5 text-left">
          <p className="text-muted-foreground font-mono text-[11px] tracking-wide">
            {todo.code}
          </p>
          <p className="text-sm font-medium leading-snug">{todo.title}</p>
          {todo.project ? (
            <p className="text-muted-foreground text-[11px]">{todo.project}</p>
          ) : null}
        </div>
        {showChevron ? (
          <ChevronRightIcon
            className="text-muted-foreground size-3.5 shrink-0 opacity-60"
            aria-hidden
          />
        ) : null}
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

  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (isDragging) {
      suppressClickRef.current = true;
    }
  }, [isDragging]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`Buka detail ${todo.code}`}
      className={cn(
        "group cursor-pointer touch-none rounded-md transition-[box-shadow]",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        isDragging && "opacity-40"
      )}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onOpen(todo);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(todo);
        }
      }}
    >
      <TodoCardFace
        todo={todo}
        className={cn(
          "transition-[background-color,border-color,box-shadow]",
          "group-hover:bg-accent/50 group-hover:border-foreground/15 group-hover:shadow-sm",
          "group-focus-visible:bg-accent/50 group-focus-visible:border-foreground/15"
        )}
      />
    </div>
  );
}
