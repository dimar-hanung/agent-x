import { FilesWorkspace } from "@/components/dashboard/files/files-workspace";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
  USER_STORAGE_QUOTA_BYTES,
} from "@/lib/files/constants";
import {
  getBreadcrumb,
  getFileById,
  getQuota,
  listFiles,
} from "@/lib/files/repository";
import type { FileListItem } from "@/lib/files/schemas";
import { isSeaweedfsConfigured } from "@/lib/files/s3-client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string | string[] }>;
}) {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const configured = isSeaweedfsConfigured();
  let files: FileListItem[] = [];
  let breadcrumb: FileListItem[] = [];
  let parentId: string | null = null;
  let quota = {
    usedBytes: 0,
    limitBytes: USER_STORAGE_QUOTA_BYTES,
    percent: 0,
  };

  if (configured) {
    try {
      const { folder: folderParam } = await searchParams;
      const folderId = Array.isArray(folderParam)
        ? folderParam[0]
        : folderParam;

      if (folderId && UUID_RE.test(folderId)) {
        const resolved = await getFileById(user.userId, folderId);
        if (resolved?.kind === "folder") {
          parentId = resolved.id;
          breadcrumb = await getBreadcrumb(user.userId, parentId);
        }
      }

      files = await listFiles(user.userId, parentId);
      quota = await getQuota(user.userId);
    } catch (error) {
      console.error("Files page load error:", error);
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>File</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">File</h1>
          <p className="text-muted-foreground text-sm">
            Penyimpanan pribadi (batas 20 GB). Kelola file dengan tampilan grid
            atau list, urutkan, cari, dan seret file untuk mengunggah.
          </p>
        </div>
        <FilesWorkspace
          initialFiles={files}
          initialQuota={quota}
          initialParentId={parentId}
          initialBreadcrumb={breadcrumb}
          storageConfigured={configured}
          storageMessage={
            configured ? undefined : SEAWEEDFS_NOT_CONFIGURED_MESSAGE
          }
        />
      </div>
    </>
  );
}
