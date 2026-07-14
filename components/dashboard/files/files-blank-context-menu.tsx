"use client";

import type { ReactNode } from "react";
import { FolderPlus, Upload } from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FilesBlankContextMenuProps {
  busy?: boolean;
  children: ReactNode;
  onUpload: () => void;
  onNewFolder: () => void;
}

/** Right-click on empty space → Unggah / Folder baru (Drive-like). */
export function FilesBlankContextMenu({
  busy,
  children,
  onUpload,
  onNewFolder,
}: FilesBlankContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={busy}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem disabled={busy} onSelect={onUpload}>
          <Upload />
          Unggah file
        </ContextMenuItem>
        <ContextMenuItem disabled={busy} onSelect={onNewFolder}>
          <FolderPlus />
          Folder baru
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
