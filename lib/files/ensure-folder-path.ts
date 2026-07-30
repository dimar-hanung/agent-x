import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { userFiles } from "@/lib/db/schema";

import { createFolder } from "./repository";

async function findFolderByName(
  userId: string,
  parentId: string | null,
  name: string
) {
  const [row] = await db
    .select()
    .from(userFiles)
    .where(
      and(
        eq(userFiles.userId, userId),
        parentId === null
          ? isNull(userFiles.parentId)
          : eq(userFiles.parentId, parentId),
        eq(userFiles.name, name),
        eq(userFiles.kind, "folder")
      )
    )
    .limit(1);

  return row ?? null;
}

export async function ensureFolderPath(
  userId: string,
  segments: string[]
): Promise<string | null> {
  let parentId: string | null = null;

  for (const segment of segments) {
    const name = segment.trim();
    if (!name) {
      continue;
    }

    const existing = await findFolderByName(userId, parentId, name);
    if (existing) {
      parentId = existing.id;
      continue;
    }

    const created = await createFolder(userId, { name, parentId });
    parentId = created.id;
  }

  return parentId;
}
