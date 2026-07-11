import { and, desc, eq, or } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  apifySocialSnapshots,
  type ApifySocialPlatform,
  type ApifySocialSnapshot,
} from "@/lib/db/schema";

import type { JsonObject } from "./types";

export interface CreateApifySocialSnapshotInput {
  userId: string;
  chatId: string | null;
  platform: ApifySocialPlatform;
  actorId: string;
  queryHash: string;
  normalizedInput: JsonObject;
  actorInput: JsonObject;
}

export async function findLatestCompletedSnapshot({
  userId,
  platform,
  queryHash,
}: {
  userId: string;
  platform: ApifySocialPlatform;
  queryHash: string;
}): Promise<ApifySocialSnapshot | null> {
  const [row] = await db
    .select()
    .from(apifySocialSnapshots)
    .where(
      and(
        eq(apifySocialSnapshots.userId, userId),
        eq(apifySocialSnapshots.platform, platform),
        eq(apifySocialSnapshots.queryHash, queryHash),
        eq(apifySocialSnapshots.status, "completed")
      )
    )
    .orderBy(
      desc(apifySocialSnapshots.completedAt),
      desc(apifySocialSnapshots.createdAt)
    )
    .limit(1);

  return row ?? null;
}

export async function findPendingSnapshot({
  userId,
  platform,
  queryHash,
}: {
  userId: string;
  platform: ApifySocialPlatform;
  queryHash: string;
}): Promise<ApifySocialSnapshot | null> {
  const [row] = await db
    .select()
    .from(apifySocialSnapshots)
    .where(
      and(
        eq(apifySocialSnapshots.userId, userId),
        eq(apifySocialSnapshots.platform, platform),
        eq(apifySocialSnapshots.queryHash, queryHash),
        or(
          eq(apifySocialSnapshots.status, "queued"),
          eq(apifySocialSnapshots.status, "running")
        )
      )
    )
    .orderBy(desc(apifySocialSnapshots.createdAt))
    .limit(1);

  return row ?? null;
}

export async function createQueuedSnapshot(
  input: CreateApifySocialSnapshotInput
): Promise<ApifySocialSnapshot> {
  const [row] = await db
    .insert(apifySocialSnapshots)
    .values({
      userId: input.userId,
      chatId: input.chatId,
      platform: input.platform,
      actorId: input.actorId,
      queryHash: input.queryHash,
      normalizedInput: input.normalizedInput,
      actorInput: input.actorInput,
      status: "queued",
      updatedAt: new Date(),
    })
    .returning();

  return row;
}

export async function listQueuedSnapshots(
  limit = 5
): Promise<ApifySocialSnapshot[]> {
  return db
    .select()
    .from(apifySocialSnapshots)
    .where(eq(apifySocialSnapshots.status, "queued"))
    .orderBy(apifySocialSnapshots.createdAt)
    .limit(limit);
}

export async function listRunningSnapshots(
  limit = 20
): Promise<ApifySocialSnapshot[]> {
  return db
    .select()
    .from(apifySocialSnapshots)
    .where(eq(apifySocialSnapshots.status, "running"))
    .orderBy(apifySocialSnapshots.updatedAt)
    .limit(limit);
}

export async function markSnapshotRunning({
  snapshotId,
  apifyRunId,
  apifyDatasetId,
}: {
  snapshotId: string;
  apifyRunId: string;
  apifyDatasetId?: string | null;
}): Promise<ApifySocialSnapshot> {
  const [row] = await db
    .update(apifySocialSnapshots)
    .set({
      status: "running",
      apifyRunId,
      apifyDatasetId: apifyDatasetId ?? null,
      startedAt: new Date(),
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(apifySocialSnapshots.id, snapshotId))
    .returning();

  return row;
}

export async function markSnapshotCompleted({
  snapshotId,
  apifyDatasetId,
  items,
}: {
  snapshotId: string;
  apifyDatasetId: string;
  items: unknown[];
}): Promise<ApifySocialSnapshot> {
  const [row] = await db
    .update(apifySocialSnapshots)
    .set({
      status: "completed",
      apifyDatasetId,
      items,
      itemCount: items.length,
      error: null,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(apifySocialSnapshots.id, snapshotId))
    .returning();

  return row;
}

export async function markSnapshotFailed({
  snapshotId,
  error,
}: {
  snapshotId: string;
  error: string;
}): Promise<ApifySocialSnapshot> {
  const [row] = await db
    .update(apifySocialSnapshots)
    .set({
      status: "failed",
      error,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(apifySocialSnapshots.id, snapshotId))
    .returning();

  return row;
}

export async function touchSnapshot(snapshotId: string): Promise<void> {
  await db
    .update(apifySocialSnapshots)
    .set({ updatedAt: new Date() })
    .where(eq(apifySocialSnapshots.id, snapshotId));
}