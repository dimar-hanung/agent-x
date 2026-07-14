"use client";

import { Download, FolderOpen, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FileListItem } from "@/lib/files/schemas";

interface FileItemMenuProps {
  item: FileListItem;
  busy?: boolean;
  className?: string;
  onOpenFolder?: (folder: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onRename: (item: FileListItem) => void;
  onDelete: (item: FileListItem) => void;
}

export function FileItemMenu({
  item,
  busy,
  className,
  onOpenFolder,
  onDownload,
  onRename,
  onDelete,
}: FileItemMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("shrink-0", className)}
          disabled={busy}
          aria-label={`Aksi untuk ${item.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">Aksi</span>
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        {item.kind === "folder" && onOpenFolder ? (
          <DropdownMenuItem onSelect={() => onOpenFolder(item)}>
            <FolderOpen />
            Buka
          </DropdownMenuItem>
        ) : null}
        {item.kind === "file" ? (
          <DropdownMenuItem onSelect={() => onDownload(item)}>
            <Download />
            Unduh
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => onRename(item)}>
          <Pencil />
          Ganti nama
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDelete(item)}
        >
          <Trash2 />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
