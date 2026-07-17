"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";

import { TodoCardFace } from "./todo-card";
import { TodoKanbanColumn } from "./todo-kanban-column";
import { useKanbanCollapsedStatuses } from "@/hooks/use-kanban-collapsed-statuses";
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

const kanbanCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const collisions =
    pointerCollisions.length > 0
      ? pointerCollisions
      : (() => {
          const rectCollisions = rectIntersection(args);
          return rectCollisions.length > 0
            ? rectCollisions
            : closestCorners(args);
        })();

  if (collisions.length === 0) {
    return [];
  }

  // Prefer a card over its parent column when both intersect
  const overCard = collisions.find((collision) => !isStatus(collision.id));
  if (overCard) {
    return [overCard];
  }

  return collisions;
};

export function TodoKanban({
  todos,
  onTodosChange,
  onOpen,
  onPersistMove,
}: TodoKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<TodoListItem[] | null>(null);
  const { isCollapsed, toggle } = useKanbanCollapsedStatuses();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  const activeTodo = activeId
    ? todos.find((todo) => todo.id === activeId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setActiveWidth(event.active.rect.current.initial?.width ?? null);
    setSnapshot(todos);
  }

  function clearDragState() {
    setActiveId(null);
    setActiveWidth(null);
    setSnapshot(null);
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
    const dragSnapshot = snapshot;
    clearDragState();

    const persistCurrent = async () => {
      const movedTodo = todos.find((todo) => todo.id === active.id);
      if (!movedTodo) return;

      const original = dragSnapshot?.find((todo) => todo.id === active.id);
      if (
        original &&
        original.status === movedTodo.status &&
        original.position === movedTodo.position
      ) {
        return;
      }

      try {
        await onPersistMove(movedTodo.id, movedTodo.status, movedTodo.position);
      } catch {
        if (dragSnapshot) {
          onTodosChange(dragSnapshot);
        }
      }
    };

    // Drop outside a target: keep optimistic dragOver result if any
    if (!over) {
      await persistCurrent();
      return;
    }

    const originalStatus = dragSnapshot
      ? getStatusOf(dragSnapshot, active.id)
      : getStatusOf(todos, active.id);
    const overStatus = getStatusOf(todos, over.id);
    const currentStatus = getStatusOf(todos, active.id);

    if (!originalStatus || !overStatus || !currentStatus) {
      await persistCurrent();
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
    } else if (isStatus(over.id) && currentStatus !== overStatus) {
      // Dropped on empty (or column body) — move to end of that column
      const activeTodoItem = todos.find((todo) => todo.id === active.id);
      if (activeTodoItem) {
        const withoutActive = todos.filter((todo) => todo.id !== active.id);
        const targetColumn = withoutActive
          .filter((todo) => todo.status === overStatus)
          .sort((a, b) => a.position - b.position);

        targetColumn.push({
          ...activeTodoItem,
          status: overStatus,
          position: targetColumn.length,
        });

        nextTodos = reindexColumn(
          [
            ...withoutActive.filter((todo) => todo.status !== overStatus),
            ...targetColumn,
          ],
          currentStatus
        );
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
      collisionDetection={kanbanCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="-mx-4 flex min-h-[280px] gap-3 overflow-x-auto overscroll-x-contain px-4 py-0.5 sm:min-h-[320px] md:mx-0 md:px-0.5">
        {TODO_STATUS_ORDER.map((status) => (
          <TodoKanbanColumn
            key={status}
            status={status}
            todos={todos.filter((todo) => todo.status === status)}
            collapsed={isCollapsed(status)}
            onToggleCollapsed={() => toggle(status)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTodo ? (
          <TodoCardFace
            todo={activeTodo}
            className="ring-ring cursor-grabbing shadow-lg ring-2"
            style={activeWidth ? { width: activeWidth } : undefined}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
