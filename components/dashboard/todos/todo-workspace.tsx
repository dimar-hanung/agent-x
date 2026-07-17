"use client";

import { LayoutGridIcon, ListIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  FILTER_ALL,
  FILTER_NO_PROJECT,
  TodoFilters,
  type TodoFiltersState,
} from "./todo-filters";
import { TodoFormDialog } from "./todo-form-dialog";
import { TodoKanban } from "./todo-kanban";
import { TodoTable } from "./todo-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { TodoStatus } from "@/lib/db/schema";
import { appRoutes } from "@/lib/site-config";
import type { TodoListItem } from "@/lib/todos/schemas";

type ViewMode = "kanban" | "table";

interface TodoWorkspaceProps {
  initialTodos: TodoListItem[];
}

const EMPTY_FILTERS: TodoFiltersState = {
  query: "",
  project: FILTER_ALL,
  status: FILTER_ALL,
};

function collectProjects(todos: TodoListItem[]): string[] {
  const seen = new Set<string>();
  const projects: string[] = [];

  for (const todo of todos) {
    if (!todo.project) continue;
    const key = todo.project.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    projects.push(todo.project);
  }

  return projects.sort((a, b) => a.localeCompare(b, "id"));
}

function filterTodos(
  todos: TodoListItem[],
  filters: TodoFiltersState
): TodoListItem[] {
  const query = filters.query.trim().toLowerCase();

  return todos.filter((todo) => {
    if (filters.status !== FILTER_ALL && todo.status !== filters.status) {
      return false;
    }

    if (filters.project === FILTER_NO_PROJECT) {
      if (todo.project) return false;
    } else if (filters.project !== FILTER_ALL) {
      if (todo.project !== filters.project) return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      todo.code,
      todo.title,
      todo.description ?? "",
      todo.project ?? "",
      ...todo.tags,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function TodoWorkspace({ initialTodos }: TodoWorkspaceProps) {
  const router = useRouter();
  const [todos, setTodos] = useState(initialTodos);
  const [view, setView] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<TodoFiltersState>(EMPTY_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TodoListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusChangeError, setStatusChangeError] = useState<string | null>(
    null
  );

  const projects = useMemo(() => collectProjects(todos), [todos]);
  const filteredTodos = useMemo(
    () => filterTodos(todos, filters),
    [todos, filters]
  );

  function openCreateDialog() {
    setFormOpen(true);
  }

  function openTodoDetail(todo: TodoListItem) {
    router.push(`${appRoutes.todos}/${todo.id}`);
  }

  function handleTodoSaved(todo: TodoListItem) {
    setTodos((prev) => {
      const index = prev.findIndex((item) => item.id === todo.id);
      if (index === -1) {
        return [...prev, todo];
      }
      const next = [...prev];
      next[index] = todo;
      return next;
    });
  }

  function handleKanbanChange(nextVisible: TodoListItem[]) {
    const visibleIds = new Set(filteredTodos.map((todo) => todo.id));
    const nextById = new Map(nextVisible.map((todo) => [todo.id, todo]));

    setTodos((prev) =>
      prev.map((todo) => {
        if (!visibleIds.has(todo.id)) {
          return todo;
        }
        return nextById.get(todo.id) ?? todo;
      })
    );
  }

  async function handlePersistMove(
    todoId: string,
    status: TodoStatus,
    position: number
  ) {
    const response = await fetch(`/api/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, position }),
    });

    const data = (await response.json()) as {
      todo?: TodoListItem;
      message?: string;
    };

    if (!response.ok || !data.todo) {
      throw new Error(data.message ?? "Gagal memindahkan todo.");
    }

    setTodos((prev) =>
      prev.map((item) => (item.id === data.todo!.id ? data.todo! : item))
    );
  }

  async function handleStatusChange(todo: TodoListItem, newStatus: TodoStatus) {
    if (newStatus === todo.status) {
      return;
    }

    const previousStatus = todo.status;
    setStatusChangeError(null);

    setTodos((prev) =>
      prev.map((item) =>
        item.id === todo.id ? { ...item, status: newStatus } : item
      )
    );

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = (await response.json()) as {
        todo?: TodoListItem;
        message?: string;
      };

      if (!response.ok || !data.todo) {
        throw new Error(data.message ?? "Gagal mengubah status.");
      }

      setTodos((prev) =>
        prev.map((item) => (item.id === data.todo!.id ? data.todo! : item))
      );
    } catch (error) {
      setTodos((prev) =>
        prev.map((item) =>
          item.id === todo.id ? { ...item, status: previousStatus } : item
        )
      );
      setStatusChangeError(
        error instanceof Error ? error.message : "Gagal mengubah status."
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/todos/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setDeleteError(data.message ?? "Gagal menghapus todo.");
        return;
      }

      setTodos((prev) => prev.filter((todo) => todo.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            type="button"
            size="sm"
            variant={view === "kanban" ? "secondary" : "ghost"}
            onClick={() => setView("kanban")}
            aria-label="Tampilan kanban"
          >
            <LayoutGridIcon />
            Kanban
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "table" ? "secondary" : "ghost"}
            onClick={() => setView("table")}
            aria-label="Tampilan tabel"
          >
            <ListIcon />
            Tabel
          </Button>
        </div>
        <Button type="button" onClick={openCreateDialog}>
          <PlusIcon />
          Tambah
        </Button>
      </div>

      <TodoFilters
        projects={projects}
        value={filters}
        onChange={setFilters}
      />

      {filteredTodos.length === 0 && todos.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          Tidak ada todo yang cocok dengan filter.
        </p>
      ) : null}

      {statusChangeError ? (
        <p className="text-destructive text-sm" role="alert">
          {statusChangeError}
        </p>
      ) : null}

      {view === "kanban" ? (
        <TodoKanban
          todos={filteredTodos}
          onTodosChange={handleKanbanChange}
          onOpen={openTodoDetail}
          onPersistMove={handlePersistMove}
        />
      ) : (
        <TodoTable
          todos={filteredTodos}
          onOpen={openTodoDetail}
          onDelete={setDeleteTarget}
          onStatusChange={handleStatusChange}
        />
      )}

      <TodoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        projectSuggestions={projects}
        onSuccess={handleTodoSaved}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus todo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.code} — "${deleteTarget.title}" akan dihapus permanen.`
                : "Todo akan dihapus permanen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="text-destructive text-sm" role="alert">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isDeleting ? "Menghapus…" : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
