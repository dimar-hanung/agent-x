import {
  File as FileGlyph,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  Presentation,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { FileListItem } from "@/lib/files/schemas";

import { getFileCategory, type FileCategory } from "./file-utils";

const CATEGORY_ICON: Record<FileCategory, LucideIcon> = {
  folder: Folder,
  pdf: FileText,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  code: FileCode,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  document: FileText,
  file: FileGlyph,
};

const CATEGORY_COLOR: Record<FileCategory, string> = {
  folder: "text-amber-500",
  pdf: "text-red-500",
  image: "text-emerald-500",
  video: "text-rose-500",
  audio: "text-fuchsia-500",
  archive: "text-orange-500",
  code: "text-violet-500",
  spreadsheet: "text-emerald-600",
  presentation: "text-orange-600",
  document: "text-blue-500",
  file: "text-muted-foreground",
};

interface FileIconProps {
  item: FileListItem;
  className?: string;
}

export function FileIcon({ item, className }: FileIconProps) {
  const category = getFileCategory(item);
  const Icon = CATEGORY_ICON[category];
  return (
    <Icon
      className={cn(
        "shrink-0",
        CATEGORY_COLOR[category],
        className
      )}
      aria-hidden
    />
  );
}
