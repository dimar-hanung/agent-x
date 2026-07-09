"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";

import { TodoKanbanColumn } from "./todo-kanban-column";
import { Badge } from "@/components/ui/badge";
import { TODO_STATUSES, type TodoStatus } from "@/lib/db/schema";
import { TODO_STATUS_ORDER } from "@/lib/todos/labels";
import type { TodoListItem } from "@/lib/todos/schemas";

interface TodoKanbanProps {
  todos: TodoListItem[];
  onTodosChange: (todos: TodoListItem[]) => void;
  onOpen: (todo: TodoListItem) => void;
  onPersistMove: (
    todoId: string,
    status: TodoStatus,
    position: number
  ) => Promise<void>;
}

function isStatus(id: string | number): id is TodoStatus {
  return TODO_STATUSES.includes(String(id) as TodoStatus);
}

function getStatusOf(
  todos: TodoListItem[],
  id: string | number
): TodoStatus | null {
  if (isStatus(id)) {
    return id;
  }
  return todos.find((todo) => todo.id === id)?.status ?? null;
}

function reindexColumn(
  todos: TodoListItem[],
  status: TodoStatus
): TodoListItem[] {
  const column = todos
    .filter((todo) => todo.status === status)
    .sort((a, b) => a.position - b.position)
    .map((todo, index) => ({ ...todo, position: index }));

  return [
    ...todos.filter((todo) => todo.status !== status),
    ...column,
  ];
}

export function TodoKanban({
  todos,
  onTodosChange,
  onOpen,
  onPersistMove,
}: TodoKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TodoListItem[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const activeTodo = activeId
    ? todos.find((todo) => todo.id === activeId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setSnapshot(todos);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const fromStatus = getStatusOf(todos, active.id);
    const toStatus = getStatusOf(todos, over.id);

    if (!fromStatus || !toStatus || fromStatus === toStatus) {
      return;
    }

    const activeTodoItem = todos.find((todo) => todo.id === active.id);
    if (!activeTodoItem) return;

    const overColumn = todos
      .filter((todo) => todo.status === toStatus && todo.id !== active.id)
      .sort((a, b) => a.position - b.position);

    const overIndex = isStatus(over.id)
      ? overColumn.length
      : Math.max(
          0,
          overColumn.findIndex((todo) => todo.id === over.id)
        );

    const moved: TodoListItem = {
      ...activeTodoItem,
      status: toStatus,
      position: overIndex,
    };

    const withoutActive = todos.filter((todo) => todo.id !== active.id);
    const targetColumn = withoutActive
      .filter((todo) => todo.status === toStatus)
      .sort((a, b) => a.position - b.position);

    targetColumn.splice(overIndex, 0, moved);

    const next = [
      ...withoutActive.filter((todo) => todo.status !== toStatus),
      ...targetColumn.map((todo, index) => ({
        ...todo,
        status: toStatus,
        position: index,
      })),
    ];

    onTodosChange(reindexColumn(next, fromStatus));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    const dragSnapshot = snapshot;
    setSnapshot(null);

    if (!over) {
      if (dragSnapshot) {
        onTodosChange(dragSnapshot);
      }
      return;
    }

    const originalStatus = dragSnapshot
      ? getStatusOf(dragSnapshot, active.id)
      : getStatusOf(todos, active.id);
    const overStatus = getStatusOf(todos, over.id);
    const currentStatus = getStatusOf(todos, active.id);

    if (!originalStatus || !overStatus || !currentStatus) {
      return;
    }

    let nextTodos = todos;

    // Reorder within column only when the item never left its original column
    if (originalStatus === overStatus && currentStatus === overStatus) {
      const column = todos
        .filter((todo) => todo.status === originalStatus)
        .sort((a, b) => a.position - b.position);

      const oldIndex = column.findIndex((todo) => todo.id === active.id);
      const newIndex = isStatus(over.id)
        ? column.length - 1
        : column.findIndex((todo) => todo.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const moved = arrayMove(column, oldIndex, newIndex).map(
          (todo, index) => ({ ...todo, position: index })
        );
        nextTodos = [
          ...todos.filter((todo) => todo.status !== originalStatus),
          ...moved,
        ];
        onTodosChange(nextTodos);
      }
    }

    const movedTodo = nextTodos.find((todo) => todo.id === active.id);

    if (!movedTodo) {
      return;
    }

    try {
      await onPersistMove(movedTodo.id, movedTodo.status, movedTodo.position);
    } catch {
      if (dragSnapshot) {
        onTodosChange(dragSnapshot);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TODO_STATUS_ORDER.map((status) => (
          <TodoKanbanColumn
            key={status}
            status={status}
            todos={todos.filter((todo) => todo.status === status)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTodo ? (
          <div className="bg-card w-[260px] rounded-md border p-3 shadow-md">
            <p className="text-muted-foreground font-mono text-[11px] tracking-wide">
              {activeTodo.code}
            </p>
            <p className="text-sm font-medium">{activeTodo.title}</p>
            {activeTodo.project ? (
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {activeTodo.project}
              </p>
            ) : null}
            {activeTodo.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {activeTodo.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
