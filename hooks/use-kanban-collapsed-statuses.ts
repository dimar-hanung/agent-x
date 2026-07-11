"use client";

import { useCallback, useEffect, useState } from "react";

import { TODO_STATUSES, type TodoStatus } from "@/lib/db/schema";

const STORAGE_KEY = "agentx:todos:kanban-collapsed";

function isTodoStatus(value: unknown): value is TodoStatus {
  return (
    typeof value === "string" &&
    TODO_STATUSES.includes(value as TodoStatus)
  );
}

function parseCollapsed(raw: string | null): Set<TodoStatus> {
  if (!raw) return new Set();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    const next = new Set<TodoStatus>();
    for (const item of parsed) {
      if (isTodoStatus(item)) {
        next.add(item);
      }
    }
    return next;
  } catch {
    return new Set();
  }
}

function writeCollapsed(collapsed: Set<TodoStatus>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Ignore quota / private-mode write failures.
  }
}

export function useKanbanCollapsedStatuses() {
  const [collapsed, setCollapsed] = useState<Set<TodoStatus>>(() => new Set());

  useEffect(() => {
    setCollapsed(parseCollapsed(localStorage.getItem(STORAGE_KEY)));
  }, []);

  const isCollapsed = useCallback(
    (status: TodoStatus) => collapsed.has(status),
    [collapsed]
  );

  const toggle = useCallback((status: TodoStatus) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      writeCollapsed(next);
      return next;
    });
  }, []);

  return { collapsed, isCollapsed, toggle };
}
