"use client";

import type { ReactNode } from "react";
import { Download, FolderOpen, Pencil, Trash2 } from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { FileListItem } from "@/lib/files/schemas";

interface FileItemContextMenuProps {
  item: FileListItem;
  busy?: boolean;
  children: ReactNode;
  onOpenFolder: (folder: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onRename: (item: FileListItem) => void;
  onDelete: (item: FileListItem) => void;
}

export function FileItemContextMenu({
  item,
  busy,
  children,
  onOpenFolder,
  onDownload,
  onRename,
  onDelete,
}: FileItemContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={busy}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {item.kind === "folder" ? (
          <ContextMenuItem
            disabled={busy}
            onSelect={() => onOpenFolder(item)}
          >
            <FolderOpen />
            Buka
          </ContextMenuItem>
        ) : (
          <ContextMenuItem
            disabled={busy}
            onSelect={() => onDownload(item)}
          >
            <Download />
            Unduh
          </ContextMenuItem>
        )}
        <ContextMenuItem
          disabled={busy}
          onSelect={() => onRename(item)}
        >
          <Pencil />
          Ganti nama
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          disabled={busy}
          onSelect={() => onDelete(item)}
        >
          <Trash2 />
          Hapus
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
