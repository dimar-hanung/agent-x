"use client";

import {
  ChevronDown,
  FolderOpen,
  FolderPlus,
  Grid3x3,
  List,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { FileListItem, QuotaInfo } from "@/lib/files/schemas";
import { appRoutes } from "@/lib/site-config";

import { FilesBlankContextMenu } from "./files-blank-context-menu";
import { FilesGridView } from "./files-grid-view";
import { FilesListView } from "./files-list-view";
import { StorageMeter } from "./storage-meter";
import {
  SORT_OPTIONS,
  filterByName,
  sortItems,
  type SortKey,
} from "./file-utils";

type ViewMode = "grid" | "list";

interface FilesWorkspaceProps {
  initialFiles: FileListItem[];
  initialQuota: QuotaInfo;
  initialParentId: string | null;
  initialBreadcrumb: FileListItem[];
  storageConfigured: boolean;
  storageMessage?: string;
}

function hasFilesPayload(event: React.DragEvent): boolean {
  const types = event.dataTransfer?.types;
  return !!types && Array.from(types).includes("Files");
}

export function FilesWorkspace({
  initialFiles,
  initialQuota,
  initialParentId,
  initialBreadcrumb,
  storageConfigured,
  storageMessage,
}: FilesWorkspaceProps) {
  const router = useRouter();
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [prevParentId, setPrevParentId] = useState<string | null>(initialParentId);
  const [breadcrumb, setBreadcrumb] = useState<FileListItem[]>(initialBreadcrumb);
  const [files, setFiles] = useState(initialFiles);
  const [quota, setQuota] = useState(initialQuota);
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<FileListItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FileListItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const refreshQuota = useCallback(async () => {
    const response = await fetch("/api/files/quota");
    if (!response.ok) return;
    const data = (await response.json()) as { quota?: QuotaInfo };
    if (data.quota) setQuota(data.quota);
  }, []);

  function navigateToFolder(folderId: string | null) {
    setBusy(true);
    setBusyLabel("Memuat…");
    setError(null);
    const href = folderId
      ? `${appRoutes.files}?folder=${folderId}`
      : appRoutes.files;
    router.push(href, { scroll: false });
  }

  function openFolder(folder: FileListItem) {
    navigateToFolder(folder.id);
  }

  function goToRoot() {
    navigateToFolder(null);
  }

  function goToCrumb(index: number) {
    if (index < 0) {
      goToRoot();
      return;
    }
    const target = breadcrumb[index];
    if (target) navigateToFolder(target.id);
  }

  // Adopt server-rendered folder data whenever the URL folder changes
  // (forward navigation, Back/Forward, deep links). Adjusting state during
  // render (instead of in an effect) avoids a cascading render and keeps
  // view/sort prefs across folders. Local mutations never change these
  // props, so optimistic state is preserved within a folder.
  if (prevParentId !== initialParentId) {
    setPrevParentId(initialParentId);
    setFiles(initialFiles);
    setBreadcrumb(initialBreadcrumb);
    setParentId(initialParentId);
    setQuery("");
    setError(null);
    setBusy(false);
    setBusyLabel(null);
  }

  async function handleCreateFolder() {
    const name = folderName.trim();
    if (!name) return;

    setBusy(true);
    setBusyLabel("Membuat folder…");
    setError(null);
    try {
      const response = await fetch("/api/files/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId }),
      });
      const data = (await response.json().catch(() => null)) as {
        file?: FileListItem;
        message?: string;
      } | null;

      if (!response.ok || !data?.file) {
        setError(data?.message ?? "Gagal membuat folder.");
        return;
      }

      setFiles((prev) => sortItems([...prev, data.file!], sort));
      setNewFolderOpen(false);
      setFolderName("");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
      setBusyLabel(null);
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setBusy(true);
    setBusyLabel("Mengunggah…");
    setError(null);

    try {
      for (const file of Array.from(fileList)) {
        const sessionRes = await fetch("/api/files/upload-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            parentId,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }),
        });
        const sessionData = (await sessionRes.json().catch(() => null)) as {
          file?: FileListItem;
          uploadUrl?: string;
          message?: string;
        } | null;

        if (!sessionRes.ok || !sessionData?.uploadUrl || !sessionData.file) {
          setError(sessionData?.message ?? "Gagal memulai unggahan.");
          break;
        }

        let putRes: Response;
        try {
          putRes = await fetch(sessionData.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
            body: file,
          });
        } catch {
          setError("Terjadi kesalahan saat mengunggah.");
          break;
        }

        if (!putRes.ok) {
          setError("Gagal mengunggah ke penyimpanan.");
          await fetch(`/api/files/${sessionData.file.id}`, {
            method: "DELETE",
          }).catch(() => undefined);
          break;
        }

        const confirmRes = await fetch("/api/files/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: sessionData.file.id }),
        });
        const confirmData = (await confirmRes.json().catch(() => null)) as {
          file?: FileListItem;
          message?: string;
        } | null;

        if (!confirmRes.ok || !confirmData?.file) {
          setError(confirmData?.message ?? "Gagal mengonfirmasi unggahan.");
          break;
        }

        setFiles((prev) => sortItems([...prev, confirmData.file!], sort));
      }

      await refreshQuota();
    } catch {
      setError("Terjadi kesalahan saat mengunggah.");
    } finally {
      setBusy(false);
      setBusyLabel(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function triggerUpload() {
    setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function handleDownload(item: FileListItem) {
    setError(null);
    try {
      const response = await fetch(`/api/files/${item.id}/download-url`);
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
      } | null;

      if (!response.ok || !data?.url) {
        setError(data?.message ?? "Gagal mengunduh file.");
        return;
      }

      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Terjadi kesalahan saat mengunduh.");
    }
  }

  async function handleRename() {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return;

    setBusy(true);
    setBusyLabel("Menyimpan…");
    setError(null);
    try {
      const response = await fetch(`/api/files/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json().catch(() => null)) as {
        file?: FileListItem;
        message?: string;
      } | null;

      if (!response.ok || !data?.file) {
        setError(data?.message ?? "Gagal mengganti nama.");
        return;
      }

      setFiles((prev) =>
        sortItems(
          prev.map((f) => (f.id === data.file!.id ? data.file! : f)),
          sort
        )
      );
      setRenameTarget(null);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
      setBusyLabel(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setBusy(true);
    setBusyLabel("Menghapus…");
    setError(null);
    try {
      const response = await fetch(`/api/files/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        setError(data?.message ?? "Gagal menghapus.");
        return;
      }

      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
      await refreshQuota();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
      setBusyLabel(null);
    }
  }

  function handleDragEnter(event: React.DragEvent) {
    if (!hasFilesPayload(event)) return;
    event.preventDefault();
    dragCounter.current += 1;
    setDragging(true);
  }

  function handleDragOver(event: React.DragEvent) {
    if (!hasFilesPayload(event)) return;
    event.preventDefault();
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (event.dataTransfer?.files?.length) {
      void handleUpload(event.dataTransfer.files);
    }
  }

  const visibleItems = useMemo(
    () => sortItems(filterByName(files, query), sort),
    [files, query, sort]
  );

  if (!storageConfigured) {
    return (
      <p className="text-muted-foreground text-sm">
        {storageMessage ??
          "Penyimpanan file belum tersedia karena konfigurasi server belum lengkap."}
      </p>
    );
  }

  const currentFolderName = breadcrumb[breadcrumb.length - 1]?.name;
  const trimmedQuery = query.trim();

  return (
    <div className="flex flex-col gap-4">
      <StorageMeter quota={quota} />

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      className="hover:text-foreground cursor-pointer"
                      onClick={goToRoot}
                    >
                      Drive saya
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumb.map((crumb, index) => {
                  const isLast = index === breadcrumb.length - 1;
                  return (
                    <span key={crumb.id} className="flex items-center">
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="max-w-[40vw] truncate">
                            {crumb.name}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <button
                              type="button"
                              className="hover:text-foreground max-w-[30vw] cursor-pointer truncate"
                              onClick={() => goToCrumb(index)}
                            >
                              {crumb.name}
                            </button>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </span>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
            {busy ? (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Loader2 className="size-3.5 animate-spin" />
                {busyLabel ?? "Memproses…"}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" disabled={busy}>
                  <Plus />
                  Baru
                  <ChevronDown className="size-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={triggerUpload}>
                  <Upload />
                  Unggah file
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setNewFolderOpen(true)}>
                  <FolderPlus />
                  Folder baru
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari di folder ini"
              className="pl-8"
              disabled={busy}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                >
                  <SlidersHorizontal />
                  <span className="hidden sm:inline">Urutkan</span>
                  <ChevronDown className="size-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) => setSort(value as SortKey)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-1 rounded-md border p-1">
              <Button
                type="button"
                size="icon-sm"
                variant={view === "grid" ? "secondary" : "ghost"}
                onClick={() => setView("grid")}
                aria-label="Tampilan grid"
                aria-pressed={view === "grid"}
              >
                <Grid3x3 />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant={view === "list" ? "secondary" : "ghost"}
                onClick={() => setView("list")}
                aria-label="Tampilan list"
                aria-pressed={view === "list"}
              >
                <List />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {/* Content + drag-and-drop + blank-area context menu */}
      <FilesBlankContextMenu
        busy={busy}
        onUpload={triggerUpload}
        onNewFolder={() => setNewFolderOpen(true)}
      >
        <div
          className="relative min-h-[240px]"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {dragging ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/60 bg-primary/5 text-center">
              <Upload className="text-primary size-8" />
              <p className="text-sm font-medium">
                Lepaskan file untuk mengunggah
              </p>
              <p className="text-muted-foreground text-xs">
                ke {currentFolderName ?? "Drive saya"}
              </p>
            </div>
          ) : null}

          {visibleItems.length === 0 ? (
            <EmptyState hasQuery={trimmedQuery.length > 0} />
          ) : view === "grid" ? (
            <FilesGridView
              items={visibleItems}
              busy={busy}
              onOpenFolder={openFolder}
              onDownload={handleDownload}
              onRename={(item) => {
                setRenameTarget(item);
                setRenameValue(item.name);
              }}
              onDelete={setDeleteTarget}
            />
          ) : (
            <FilesListView
              items={visibleItems}
              sort={sort}
              busy={busy}
              onSortChange={setSort}
              onOpenFolder={openFolder}
              onDownload={handleDownload}
              onRename={(item) => {
                setRenameTarget(item);
                setRenameValue(item.name);
              }}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      </FilesBlankContextMenu>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => void handleUpload(e.target.files)}
      />

      {/* New folder dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Folder baru</DialogTitle>
            <DialogDescription>
              Beri nama folder di {currentFolderName ?? "Drive saya"}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateFolder();
            }}
          >
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Nama folder"
              autoFocus
              disabled={busy}
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewFolderOpen(false)}
                disabled={busy}
              >
                Batal
              </Button>
              <Button type="submit" disabled={busy || !folderName.trim()}>
                Buat
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti nama</DialogTitle>
            <DialogDescription>
              Masukkan nama baru untuk &ldquo;{renameTarget?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleRename();
            }}
          >
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              disabled={busy}
            />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
                disabled={busy}
              >
                Batal
              </Button>
              <Button type="submit" disabled={busy || !renameValue.trim()}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === "folder"
                ? `Folder "${deleteTarget?.name}" dan semua isinya akan dihapus permanen.`
                : `File "${deleteTarget?.name}" akan dihapus permanen.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Search className="size-8 opacity-40" />
        <p className="text-sm">Tidak ada file yang cocok dengan pencarian.</p>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-16 text-center">
      <FolderOpen className="size-10 opacity-40" />
      <p className="text-sm font-medium">Belum ada file di sini</p>
      <p className="text-xs">
        Unggah file, buat folder, atau seret file ke area ini.
      </p>
    </div>
  );
}
