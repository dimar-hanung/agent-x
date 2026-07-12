import { formatBytes } from "@/lib/files/format-bytes";
import type { FileListItem } from "@/lib/files/schemas";

export type FileCategory =
  | "folder"
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "spreadsheet"
  | "presentation"
  | "document"
  | "file";

export type SortKey =
  | "name-asc"
  | "name-desc"
  | "modified-desc"
  | "modified-asc"
  | "size-desc"
  | "size-asc";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Nama (A–Z)" },
  { value: "name-desc", label: "Nama (Z–A)" },
  { value: "modified-desc", label: "Terakhir diubah (terbaru)" },
  { value: "modified-asc", label: "Terakhir diubah (terlama)" },
  { value: "size-desc", label: "Ukuran (terbesar)" },
  { value: "size-asc", label: "Ukuran (terkecil)" },
];

const EXTENSION_MAP: Record<string, FileCategory> = {
  pdf: "pdf",
  // Images
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ico: "image",
  avif: "image",
  heic: "image",
  // Video
  mp4: "video",
  mov: "video",
  avi: "video",
  mkv: "video",
  webm: "video",
  m4v: "video",
  wmv: "video",
  // Audio
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  flac: "audio",
  m4a: "audio",
  aac: "audio",
  // Archive
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  tgz: "archive",
  bz2: "archive",
  xz: "archive",
  // Spreadsheet
  csv: "spreadsheet",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  ods: "spreadsheet",
  // Presentation
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  key: "presentation",
  // Document
  doc: "document",
  docx: "document",
  odt: "document",
  rtf: "document",
  txt: "document",
  md: "document",
  markdown: "document",
  // Code
  json: "code",
  js: "code",
  mjs: "code",
  cjs: "code",
  jsx: "code",
  ts: "code",
  tsx: "code",
  html: "code",
  htm: "code",
  css: "code",
  scss: "code",
  py: "code",
  rb: "code",
  go: "code",
  rs: "code",
  java: "code",
  c: "code",
  cpp: "code",
  cs: "code",
  php: "code",
  sh: "code",
  yml: "code",
  yaml: "code",
  xml: "code",
  sql: "code",
};

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

export function getFileCategory(item: FileListItem): FileCategory {
  if (item.kind === "folder") return "folder";

  const mime = (item.mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("csv")
  ) {
    return "spreadsheet";
  }
  if (mime.includes("presentation") || mime.includes("powerpoint")) {
    return "presentation";
  }
  if (mime.includes("word") || mime.includes("msword") || mime.includes("rtf")) {
    return "document";
  }
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("tar")) {
    return "archive";
  }
  if (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("xml") ||
    mime.includes("html") ||
    mime.includes("css")
  ) {
    return EXTENSION_MAP[getExtension(item.name)] ?? "document";
  }

  return EXTENSION_MAP[getExtension(item.name)] ?? "file";
}

export function formatFileDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}

export function formatFileDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function describeSize(item: FileListItem): string {
  return item.kind === "folder" ? "Folder" : formatBytes(item.sizeBytes);
}

/**
 * Folders always come first. Within each group the chosen sort is applied.
 * For size sort, folders keep name order (size is always 0).
 */
export function sortItems(items: FileListItem[], sort: SortKey): FileListItem[] {
  const folders = items.filter((i) => i.kind === "folder");
  const files = items.filter((i) => i.kind !== "folder");

  const byName = (a: FileListItem, b: FileListItem) =>
    a.name.localeCompare(b.name, "id");
  const byModified = (a: FileListItem, b: FileListItem) =>
    new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  const bySize = (a: FileListItem, b: FileListItem) => a.sizeBytes - b.sizeBytes;

  const pick = (group: FileListItem[]): FileListItem[] => {
    const copy = [...group];
    switch (sort) {
      case "name-asc":
        return copy.sort(byName);
      case "name-desc":
        return copy.sort((a, b) => byName(b, a));
      case "modified-desc":
        return copy.sort((a, b) => byModified(b, a));
      case "modified-asc":
        return copy.sort(byModified);
      case "size-desc":
        return copy.sort((a, b) => bySize(b, a));
      case "size-asc":
        return copy.sort(bySize);
      default:
        return copy.sort(byName);
    }
  };

  return [...pick(folders), ...pick(files)];
}

export function filterByName(
  items: FileListItem[],
  query: string
): FileListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) => i.name.toLowerCase().includes(q));
}
