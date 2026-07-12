import { and, eq, isNull, ne, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  userFiles,
  type UserFile,
  type UserFileKind,
  type UserFileStatus,
} from "@/lib/db/schema";

import {
  USER_STORAGE_QUOTA_BYTES,
} from "./constants";
import type {
  CreateFolderInput,
  FileListItem,
  PatchFileInput,
  QuotaInfo,
  UploadSessionInput,
} from "./schemas";
import {
  buildStorageKey,
  createPresignedGetUrl,
  createPresignedPutUrl,
  deleteObject,
  headObject,
  putObject,
} from "./s3-client";

export class FilesError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
    this.name = "FilesError";
  }
}

function toListItem(row: UserFile): FileListItem {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    kind: row.kind as UserFileKind,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes ?? 0),
    status: row.status as UserFileStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parentCondition(parentId: string | null) {
  return parentId === null
    ? isNull(userFiles.parentId)
    : eq(userFiles.parentId, parentId);
}

async function assertParentFolder(
  userId: string,
  parentId: string | null
): Promise<void> {
  if (parentId === null) {
    return;
  }

  const [parent] = await db
    .select()
    .from(userFiles)
    .where(
      and(
        eq(userFiles.id, parentId),
        eq(userFiles.userId, userId),
        eq(userFiles.kind, "folder")
      )
    )
    .limit(1);

  if (!parent) {
    throw new FilesError("Folder induk tidak ditemukan.", 404);
  }
}

async function assertNameAvailable(
  userId: string,
  parentId: string | null,
  name: string,
  excludeId?: string
): Promise<void> {
  const conditions = [
    eq(userFiles.userId, userId),
    parentCondition(parentId),
    eq(userFiles.name, name),
  ];

  if (excludeId) {
    conditions.push(ne(userFiles.id, excludeId));
  }

  const [existing] = await db
    .select({ id: userFiles.id })
    .from(userFiles)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new FilesError("Nama sudah dipakai di folder ini.", 409);
  }
}

export async function getUsedBytes(userId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sum(userFiles.sizeBytes),
    })
    .from(userFiles)
    .where(
      and(eq(userFiles.userId, userId), eq(userFiles.status, "ready"))
    );

  return Number(row?.total ?? 0);
}

export async function getQuota(userId: string): Promise<QuotaInfo> {
  const usedBytes = await getUsedBytes(userId);
  const limitBytes = USER_STORAGE_QUOTA_BYTES;
  const percent =
    limitBytes <= 0 ? 0 : Math.min(100, (usedBytes / limitBytes) * 100);

  return { usedBytes, limitBytes, percent };
}

export async function assertQuota(
  userId: string,
  additionalBytes: number
): Promise<void> {
  const used = await getUsedBytes(userId);
  if (used + additionalBytes > USER_STORAGE_QUOTA_BYTES) {
    throw new FilesError(
      "Kuota penyimpanan penuh (batas 20 GB per pengguna).",
      413
    );
  }
}

export async function listFiles(
  userId: string,
  parentId: string | null = null
): Promise<FileListItem[]> {
  await assertParentFolder(userId, parentId);

  const rows = await db
    .select()
    .from(userFiles)
    .where(
      and(
        eq(userFiles.userId, userId),
        parentCondition(parentId),
        ne(userFiles.status, "pending")
      )
    );

  // Folders first, then files by name (id locale).
  const items = rows.map(toListItem);
  items.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "id");
  });

  return items;
}

export async function getFileById(
  userId: string,
  fileId: string
): Promise<FileListItem | null> {
  const [row] = await db
    .select()
    .from(userFiles)
    .where(and(eq(userFiles.id, fileId), eq(userFiles.userId, userId)))
    .limit(1);

  return row ? toListItem(row) : null;
}

export async function getFileRow(
  userId: string,
  fileId: string
): Promise<UserFile | null> {
  const [row] = await db
    .select()
    .from(userFiles)
    .where(and(eq(userFiles.id, fileId), eq(userFiles.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function getBreadcrumb(
  userId: string,
  parentId: string | null
): Promise<FileListItem[]> {
  const chain: FileListItem[] = [];
  let currentId = parentId;

  while (currentId) {
    const row = await getFileRow(userId, currentId);
    if (!row || row.kind !== "folder") {
      break;
    }
    chain.unshift(toListItem(row));
    currentId = row.parentId;
  }

  return chain;
}

export async function createFolder(
  userId: string,
  input: CreateFolderInput
): Promise<FileListItem> {
  const parentId = input.parentId ?? null;
  const name = input.name.trim();

  await assertParentFolder(userId, parentId);
  await assertNameAvailable(userId, parentId, name);

  const [row] = await db
    .insert(userFiles)
    .values({
      userId,
      parentId,
      name,
      kind: "folder",
      mimeType: null,
      sizeBytes: 0,
      storageKey: null,
      status: "ready",
    })
    .returning();

  return toListItem(row);
}

export async function createUploadSession(
  userId: string,
  input: UploadSessionInput
): Promise<{ file: FileListItem; uploadUrl: string; storageKey: string }> {
  const parentId = input.parentId ?? null;
  const name = input.name.trim();
  const mimeType = input.mimeType?.trim() || "application/octet-stream";

  await assertParentFolder(userId, parentId);
  await assertNameAvailable(userId, parentId, name);
  await assertQuota(userId, input.sizeBytes);

  const [row] = await db
    .insert(userFiles)
    .values({
      userId,
      parentId,
      name,
      kind: "file",
      mimeType,
      sizeBytes: 0,
      storageKey: null,
      status: "pending",
    })
    .returning();

  const storageKey = buildStorageKey(userId, row.id, name);

  await db
    .update(userFiles)
    .set({ storageKey, updatedAt: new Date() })
    .where(and(eq(userFiles.id, row.id), eq(userFiles.userId, userId)));

  const uploadUrl = await createPresignedPutUrl({
    key: storageKey,
    contentType: mimeType,
  });

  return {
    file: toListItem({ ...row, storageKey, status: "pending" }),
    uploadUrl,
    storageKey,
  };
}

export async function confirmUpload(
  userId: string,
  fileId: string
): Promise<FileListItem> {
  const row = await getFileRow(userId, fileId);

  if (!row) {
    throw new FilesError("File tidak ditemukan.", 404);
  }

  if (row.kind !== "file" || row.status !== "pending" || !row.storageKey) {
    throw new FilesError("Sesi unggah tidak valid.", 400);
  }

  const head = await headObject(row.storageKey);
  await assertQuota(userId, head.contentLength);

  const [updated] = await db
    .update(userFiles)
    .set({
      status: "ready",
      sizeBytes: head.contentLength,
      mimeType: head.contentType || row.mimeType,
      updatedAt: new Date(),
    })
    .where(and(eq(userFiles.id, fileId), eq(userFiles.userId, userId)))
    .returning();

  return toListItem(updated);
}

export async function createDownloadUrl(
  userId: string,
  fileId: string
): Promise<{ url: string; file: FileListItem }> {
  const row = await getFileRow(userId, fileId);

  if (!row || row.kind !== "file" || row.status !== "ready" || !row.storageKey) {
    throw new FilesError("File tidak ditemukan.", 404);
  }

  const url = await createPresignedGetUrl({
    key: row.storageKey,
    fileName: row.name,
  });

  return { url, file: toListItem(row) };
}

async function wouldCreateCycle(
  userId: string,
  fileId: string,
  newParentId: string | null
): Promise<boolean> {
  if (newParentId === null) {
    return false;
  }

  if (newParentId === fileId) {
    return true;
  }

  let currentId: string | null = newParentId;
  while (currentId) {
    if (currentId === fileId) {
      return true;
    }
    const row = await getFileRow(userId, currentId);
    if (!row) {
      break;
    }
    currentId = row.parentId;
  }

  return false;
}

export async function patchFile(
  userId: string,
  fileId: string,
  input: PatchFileInput
): Promise<FileListItem> {
  const row = await getFileRow(userId, fileId);

  if (!row || row.status === "pending") {
    throw new FilesError("File tidak ditemukan.", 404);
  }

  const nextName = input.name !== undefined ? input.name.trim() : row.name;
  const nextParentId =
    input.parentId !== undefined ? input.parentId : row.parentId;

  if (input.parentId !== undefined) {
    await assertParentFolder(userId, nextParentId);
    if (row.kind === "folder" && (await wouldCreateCycle(userId, fileId, nextParentId))) {
      throw new FilesError("Tidak dapat memindahkan folder ke dalam dirinya sendiri.");
    }
  }

  if (nextName !== row.name || nextParentId !== row.parentId) {
    await assertNameAvailable(userId, nextParentId, nextName, fileId);
  }

  const [updated] = await db
    .update(userFiles)
    .set({
      name: nextName,
      parentId: nextParentId,
      updatedAt: new Date(),
    })
    .where(and(eq(userFiles.id, fileId), eq(userFiles.userId, userId)))
    .returning();

  return toListItem(updated);
}

async function collectDescendants(
  userId: string,
  rootId: string
): Promise<UserFile[]> {
  const all: UserFile[] = [];
  const queue = [rootId];

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = await db
      .select()
      .from(userFiles)
      .where(
        and(eq(userFiles.userId, userId), eq(userFiles.parentId, parentId))
      );

    for (const child of children) {
      all.push(child);
      if (child.kind === "folder") {
        queue.push(child.id);
      }
    }
  }

  return all;
}

export async function deleteFile(
  userId: string,
  fileId: string
): Promise<void> {
  const row = await getFileRow(userId, fileId);

  if (!row) {
    throw new FilesError("File tidak ditemukan.", 404);
  }

  const toDelete: UserFile[] = [row];

  if (row.kind === "folder") {
    const descendants = await collectDescendants(userId, fileId);
    toDelete.push(...descendants);
  }

  // Delete deepest first (children before parents) — reverse of BFS order
  const ids = toDelete.map((f) => f.id).reverse();

  for (const file of [...toDelete].reverse()) {
    if (file.kind === "file" && file.storageKey) {
      try {
        await deleteObject(file.storageKey);
      } catch (error) {
        console.error("Failed to delete S3 object:", file.storageKey, error);
      }
    }
  }

  for (const id of ids) {
    await db
      .delete(userFiles)
      .where(and(eq(userFiles.id, id), eq(userFiles.userId, userId)));
  }
}

/** Server-side upload used by AI tools. */
export async function uploadFileBytes(
  userId: string,
  params: {
    name: string;
    parentId?: string | null;
    mimeType?: string;
    body: Buffer;
  }
): Promise<FileListItem> {
  const parentId = params.parentId ?? null;
  const name = params.name.trim();
  const mimeType = params.mimeType?.trim() || "application/octet-stream";

  await assertParentFolder(userId, parentId);
  await assertNameAvailable(userId, parentId, name);
  await assertQuota(userId, params.body.byteLength);

  const [row] = await db
    .insert(userFiles)
    .values({
      userId,
      parentId,
      name,
      kind: "file",
      mimeType,
      sizeBytes: 0,
      storageKey: null,
      status: "pending",
    })
    .returning();

  const storageKey = buildStorageKey(userId, row.id, name);

  try {
    await putObject({
      key: storageKey,
      body: params.body,
      contentType: mimeType,
    });

    const [updated] = await db
      .update(userFiles)
      .set({
        storageKey,
        status: "ready",
        sizeBytes: params.body.byteLength,
        updatedAt: new Date(),
      })
      .where(and(eq(userFiles.id, row.id), eq(userFiles.userId, userId)))
      .returning();

    return toListItem(updated);
  } catch (error) {
    await db
      .delete(userFiles)
      .where(and(eq(userFiles.id, row.id), eq(userFiles.userId, userId)));
    throw error;
  }
}

export async function cleanupStalePending(userId: string, fileId: string): Promise<void> {
  await db
    .delete(userFiles)
    .where(
      and(
        eq(userFiles.id, fileId),
        eq(userFiles.userId, userId),
        eq(userFiles.status, "pending")
      )
    );
}

/** Used by list_files AI tool when listing ready items only. */
export async function listReadyFilesForUser(
  userId: string,
  parentId: string | null = null
): Promise<FileListItem[]> {
  return listFiles(userId, parentId);
}
