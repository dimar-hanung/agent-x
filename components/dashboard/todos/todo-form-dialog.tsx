"use client";

import { useEffect, useState } from "react";

import { TodoDescriptionEditor } from "./todo-description-editor";
import { TodoTagInput } from "./todo-tag-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/lib/todos/labels";
import type { TodoListItem } from "@/lib/todos/schemas";
import type { TodoStatus } from "@/lib/db/schema";

interface TodoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSuggestions?: string[];
  onSuccess: (todo: TodoListItem) => void;
}

interface TodoFormValues {
  title: string;
  description: string;
  project: string;
  status: TodoStatus;
  tags: string[];
}

const EMPTY_FORM: TodoFormValues = {
  title: "",
  description: "",
  project: "",
  status: "todo",
  tags: [],
};

export function TodoFormDialog({
  open,
  onOpenChange,
  projectSuggestions = [],
  onSuccess,
}: TodoFormDialogProps) {
  const [values, setValues] = useState<TodoFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setValues(EMPTY_FORM);
  }, [open]);

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
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        todo?: TodoListItem;
        message?: string;
      };

      if (!response.ok || !data.todo) {
        setError(data.message ?? "Gagal membuat todo.");
        return;
      }

      onSuccess(data.todo);
      onOpenChange(false);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah todo</DialogTitle>
          <DialogDescription>
            Buat item baru di board kamu. Kode task dibuat otomatis. Deskripsi
            mendukung Markdown.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="todo-title">Judul</FieldLabel>
              <Input
                id="todo-title"
                value={values.title}
                disabled={isSubmitting}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Judul todo"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="todo-project">Project</FieldLabel>
              <Input
                id="todo-project"
                value={values.project}
                disabled={isSubmitting}
                onChange={(event) => updateField("project", event.target.value)}
                placeholder="Opsional, mis. AgentX"
                list="todo-project-suggestions"
              />
              {projectSuggestions.length > 0 ? (
                <datalist id="todo-project-suggestions">
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
              <FieldLabel htmlFor="todo-tags">Tag</FieldLabel>
              <TodoTagInput
                id="todo-tags"
                value={values.tags}
                disabled={isSubmitting}
                onChange={(tags) => updateField("tags", tags)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="todo-description">Deskripsi</FieldLabel>
              <TodoDescriptionEditor
                id="todo-description"
                value={values.description}
                disabled={isSubmitting}
                onChange={(description) =>
                  updateField("description", description)
                }
                rows={6}
              />
            </Field>
          </FieldGroup>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
