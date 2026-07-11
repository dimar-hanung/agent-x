"use client";

import { ChevronRightIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatTodoDate,
  formatTodoStatus,
  TODO_STATUS_COLORS,
} from "@/lib/todos/labels";
import type { TodoListItem } from "@/lib/todos/schemas";
import { cn } from "@/lib/utils";

interface TodoTableProps {
  todos: TodoListItem[];
  onOpen: (todo: TodoListItem) => void;
  onDelete: (todo: TodoListItem) => void;
}

export function TodoTable({ todos, onOpen, onDelete }: TodoTableProps) {
  if (todos.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center text-sm">
        Belum ada todo.
      </div>
    );
  }

  const sorted = [...todos].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status.localeCompare(b.status);
    }
    return a.position - b.position;
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Kode</TableHead>
            <TableHead>Judul</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tag</TableHead>
            <TableHead>Dibuat</TableHead>
            <TableHead className="w-[100px] text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((todo) => (
            <TableRow key={todo.id}>
              <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                {todo.code}
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  className="font-medium hover:underline"
                  onClick={() => onOpen(todo)}
                >
                  {todo.title}
                </button>
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {todo.project ?? (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(TODO_STATUS_COLORS[todo.status].badge)}
                >
                  {formatTodoStatus(todo.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {todo.tags.length === 0 ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : (
                    todo.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {formatTodoDate(todo.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onOpen(todo)}
                    aria-label="Buka detail todo"
                  >
                    <ChevronRightIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(todo)}
                    aria-label="Hapus todo"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
