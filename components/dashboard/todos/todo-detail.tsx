"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";

import { TodoDescriptionEditor } from "./todo-description-editor";
import { TodoTagInput } from "./todo-tag-input";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TODO_STATUS_LABELS,
  TODO_STATUS_ORDER,
  formatTodoDate,
} from "@/lib/todos/labels";
import type { TodoListItem } from "@/lib/todos/schemas";
import type { TodoStatus } from "@/lib/db/schema";
import { appRoutes } from "@/lib/site-config";

interface TodoDetailProps {
  todo: TodoListItem;
  projectSuggestions?: string[];
}

interface TodoFormValues {
  title: string;
  description: string;
  project: string;
  status: TodoStatus;
  tags: string[];
}

function toFormValues(todo: TodoListItem): TodoFormValues {
  return {
    title: todo.title,
    description: todo.description ?? "",
    project: todo.project ?? "",
    status: todo.status,
    tags: [...todo.tags],
  };
}

export function TodoDetail({
  todo: initialTodo,
  projectSuggestions = [],
}: TodoDetailProps) {
  const router = useRouter();
  const [todo, setTodo] = useState(initialTodo);
  const [values, setValues] = useState<TodoFormValues>(() =>
    toFormValues(initialTodo)
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function updateField<K extends keyof TodoFormValues>(
    key: K,
    value: TodoFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const payload = {
      title: values.title,
      description: values.description || null,
      project: values.project || null,
      status: values.status,
      tags: values.tags,
    };

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        todo?: TodoListItem;
        message?: string;
      };

      if (!response.ok || !data.todo) {
        setError(data.message ?? "Gagal memperbarui todo.");
        return;
      }

      setTodo(data.todo);
      setValues(toFormValues(data.todo));
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setDeleteError(data.message ?? "Gagal menghapus todo.");
        return;
      }

      router.push(appRoutes.todos);
      router.refresh();
    } catch {
      setDeleteError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {todo.code}
            </Badge>
            <Badge variant="secondary">
              {TODO_STATUS_LABELS[todo.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Dibuat {formatTodoDate(todo.createdAt)} · Diperbarui{" "}
            {formatTodoDate(todo.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(appRoutes.todos)}
          >
            <ArrowLeftIcon />
            Kembali
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            <Trash2Icon />
            Hapus
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="todo-detail-title">Judul</FieldLabel>
            <Input
              id="todo-detail-title"
              value={values.title}
              disabled={isSubmitting}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Judul todo"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="todo-detail-project">Project</FieldLabel>
            <Input
              id="todo-detail-project"
              value={values.project}
              disabled={isSubmitting}
              onChange={(event) => updateField("project", event.target.value)}
              placeholder="Opsional, mis. AgentX"
              list="todo-detail-project-suggestions"
            />
            {projectSuggestions.length > 0 ? (
              <datalist id="todo-detail-project-suggestions">
                {projectSuggestions.map((project) => (
                  <option key={project} value={project} />
                ))}
              </datalist>
            ) : null}
          </Field>

          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={values.status}
              disabled={isSubmitting}
              onValueChange={(value) =>
                updateField("status", value as TodoStatus)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                {TODO_STATUS_ORDER.map((status) => (
                  <SelectItem key={status} value={status}>
                    {TODO_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="todo-detail-tags">Tag</FieldLabel>
            <TodoTagInput
              id="todo-detail-tags"
              value={values.tags}
              disabled={isSubmitting}
              onChange={(tags) => updateField("tags", tags)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="todo-detail-description">Deskripsi</FieldLabel>
            <TodoDescriptionEditor
              id="todo-detail-description"
              value={values.description}
              disabled={isSubmitting}
              onChange={(description) => updateField("description", description)}
            />
          </Field>
        </FieldGroup>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => router.push(appRoutes.todos)}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOpen(false);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus todo?</AlertDialogTitle>
            <AlertDialogDescription>
              {`${todo.code} — "${todo.title}" akan dihapus permanen.`}
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
