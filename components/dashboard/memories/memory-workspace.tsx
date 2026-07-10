"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
import type { MemoryListItem } from "@/lib/memory/schemas";

interface MemoryWorkspaceProps {
  initialMemories: MemoryListItem[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}

function sourceLabel(source: MemoryListItem["source"]): string {
  return source === "summary" ? "Otomatis" : "Chat";
}

export function MemoryWorkspace({ initialMemories }: MemoryWorkspaceProps) {
  const router = useRouter();
  const [memories, setMemories] = useState(initialMemories);
  const [deleteTarget, setDeleteTarget] = useState<MemoryListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setIsSubmitting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/memories/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        setDeleteError(data?.message ?? "Gagal menghapus preference.");
        return;
      }

      setMemories((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setDeleteError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (memories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Belum ada memory. Minta asisten mengingat preference di chat, atau biarkan
        diekstrak otomatis dari percakapan panjang.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-border max-w-3xl divide-y rounded-lg border">
        {memories.map((memory) => (
          <li
            key={memory.id}
            className="flex items-start justify-between gap-3 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm">{memory.content}</p>
              <p className="text-muted-foreground text-[11px]">
                {sourceLabel(memory.source)} · {formatDate(memory.createdAt)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive shrink-0"
              onClick={() => {
                setDeleteError(null);
                setDeleteTarget(memory);
              }}
            >
              Hapus
            </Button>
          </li>
        ))}
      </ul>

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
            <AlertDialogTitle>Hapus preference?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.content}" akan dihapus dari memory. Asisten tidak akan mengingatnya lagi.`
                : "Preference akan dihapus."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="text-destructive text-sm" role="alert">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isSubmitting ? "Menghapus…" : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
