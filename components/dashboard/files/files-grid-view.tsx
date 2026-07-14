"use client";

import type { FileListItem } from "@/lib/files/schemas";
import { cn } from "@/lib/utils";

import { FileIcon } from "./file-icon";
import { FileItemContextMenu } from "./file-item-context-menu";
import { FileItemMenu } from "./file-item-menu";
import { describeSize, formatFileDateShort } from "./file-utils";

interface FilesGridViewProps {
  items: FileListItem[];
  busy?: boolean;
  onOpenFolder: (folder: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onRename: (item: FileListItem) => void;
  onDelete: (item: FileListItem) => void;
}

export function FilesGridView({
  items,
  busy,
  onOpenFolder,
  onDownload,
  onRename,
  onDelete,
}: FilesGridViewProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => {
        const body = (
          <div className="flex h-20 items-center justify-center rounded-md bg-muted/40">
            <FileIcon item={item} className="size-10" />
          </div>
        );
        const footer = (
          <div className="min-w-0 px-3 py-2">
            <p className="line-clamp-2 break-words text-sm font-medium leading-tight">
              {item.name}
            </p>
            <p className="text-muted-foreground mt-1 truncate text-[11px]">
              {describeSize(item)} · {formatFileDateShort(item.updatedAt)}
            </p>
          </div>
        );

        return (
          <FileItemContextMenu
            key={item.id}
            item={item}
            busy={busy}
            onOpenFolder={onOpenFolder}
            onDownload={onDownload}
            onRename={onRename}
            onDelete={onDelete}
          >
            <div className="group focus-within:ring-ring relative flex flex-col rounded-lg border bg-card transition-colors hover:bg-accent/40 focus-within:ring-2">
              {item.kind === "folder" ? (
                <button
                  type="button"
                  className="flex flex-1 flex-col text-left"
                  disabled={busy}
                  onClick={() => onOpenFolder(item)}
                >
                  {body}
                  {footer}
                </button>
              ) : (
                <div className="flex flex-1 flex-col">
                  {body}
                  {footer}
                </div>
              )}

              <FileItemMenu
                item={item}
                busy={busy}
                onOpenFolder={onOpenFolder}
                onDownload={onDownload}
                onRename={onRename}
                onDelete={onDelete}
                className={cn(
                  "absolute right-1 top-1 bg-background/80 backdrop-blur transition-opacity",
                  "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100"
                )}
              />
            </div>
          </FileItemContextMenu>
        );
      })}
    </div>
  );
}
