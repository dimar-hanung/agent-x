"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

import type { FileListItem } from "@/lib/files/schemas";
import { cn } from "@/lib/utils";

import { FileIcon } from "./file-icon";
import { FileItemContextMenu } from "./file-item-context-menu";
import { FileItemMenu } from "./file-item-menu";
import { describeSize, formatFileDate, type SortKey } from "./file-utils";

interface FilesListViewProps {
  items: FileListItem[];
  sort: SortKey;
  busy?: boolean;
  onSortChange: (next: SortKey) => void;
  onOpenFolder: (folder: FileListItem) => void;
  onDownload: (item: FileListItem) => void;
  onRename: (item: FileListItem) => void;
  onDelete: (item: FileListItem) => void;
}

type SortField = "name" | "modified" | "size";

function toggleSort(field: SortField, current: SortKey): SortKey {
  const asc = `${field}-asc` as SortKey;
  const desc = `${field}-desc` as SortKey;
  if (current === asc) return desc;
  if (current === desc) return asc;
  return asc;
}

function SortArrow({ sort, field }: { sort: SortKey; field: SortField }) {
  if (sort === `${field}-asc`) return <ArrowUp className="size-3" aria-hidden />;
  if (sort === `${field}-desc`) return <ArrowDown className="size-3" aria-hidden />;
  return null;
}

function HeaderButton({
  label,
  field,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  field: SortField;
  sort: SortKey;
  onSortChange: (next: SortKey) => void;
  className?: string;
}) {
  const isActive = sort.startsWith(field);
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded text-xs font-medium transition-colors hover:text-foreground",
        isActive ? "text-foreground" : "text-muted-foreground",
        className
      )}
      onClick={() => onSortChange(toggleSort(field, sort))}
    >
      {label}
      <SortArrow sort={sort} field={field} />
    </button>
  );
}

export function FilesListView({
  items,
  sort,
  busy,
  onSortChange,
  onOpenFolder,
  onDownload,
  onRename,
  onDelete,
}: FilesListViewProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="bg-muted/40 flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <HeaderButton
            label="Nama"
            field="name"
            sort={sort}
            onSortChange={onSortChange}
          />
        </div>
        <div className="hidden w-44 shrink-0 md:block">
          <HeaderButton
            label="Diubah"
            field="modified"
            sort={sort}
            onSortChange={onSortChange}
          />
        </div>
        <div className="hidden w-28 shrink-0 sm:block">
          <HeaderButton
            label="Ukuran"
            field="size"
            sort={sort}
            onSortChange={onSortChange}
          />
        </div>
        <div className="w-10 shrink-0" aria-hidden />
      </div>

      {/* Rows */}
      <div className="divide-y">
        {items.map((item) => (
          <FileItemContextMenu
            key={item.id}
            item={item}
            busy={busy}
            onOpenFolder={onOpenFolder}
            onDownload={onDownload}
            onRename={onRename}
            onDelete={onDelete}
          >
            <div className="group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/40">
              {item.kind === "folder" ? (
                <button
                  type="button"
                  className="hover:text-foreground flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  disabled={busy}
                  onClick={() => onOpenFolder(item)}
                >
                  <FileIcon item={item} className="size-5" />
                  <span className="truncate text-sm font-medium">
                    {item.name}
                  </span>
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <FileIcon item={item} className="size-5" />
                  <span className="truncate text-sm font-medium">
                    {item.name}
                  </span>
                </div>
              )}

              <div className="text-muted-foreground hidden w-44 shrink-0 truncate text-xs md:block">
                {formatFileDate(item.updatedAt)}
              </div>
              <div className="text-muted-foreground hidden w-28 shrink-0 truncate text-xs tabular-nums sm:block">
                {describeSize(item)}
              </div>

              <FileItemMenu
                item={item}
                busy={busy}
                onOpenFolder={onOpenFolder}
                onDownload={onDownload}
                onRename={onRename}
                onDelete={onDelete}
                className="w-10 justify-end opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100"
              />
            </div>
          </FileItemContextMenu>
        ))}
      </div>
    </div>
  );
}
