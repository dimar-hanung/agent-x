"use client";

import type { ReactNode } from "react";
import { Download, FolderOpen, MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { FileListItem } from "@/lib/files/schemas";
import { isIndexableFile } from "@/lib/files/constants";
import { appRoutes } from "@/lib/site-config";

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
  const router = useRouter();
  const canAsk =
    item.kind === "file" && isIndexableFile(item.mimeType, item.name);

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
        {canAsk ? (
          <ContextMenuItem
            disabled={busy}
            onSelect={() => router.push(appRoutes.filesFileChat(item.id))}
          >
            <MessageSquareText />
            Tanya isi file
          </ContextMenuItem>
        ) : null}
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
