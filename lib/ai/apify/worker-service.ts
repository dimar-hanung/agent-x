import {
  APIFY_FAILED_RUN_STATUSES,
  APIFY_TERMINAL_RUN_STATUSES,
} from "./constants";
import {
  ApifyApiError,
  ApifyNotConfiguredError,
  defaultApifyClient,
  type ApifyClient,
} from "./client";
import { notifyApifySnapshot } from "./notify";
import {
  listQueuedSnapshots,
  listRunningSnapshots,
  markSnapshotCompleted,
  markSnapshotFailed,
  markSnapshotRunning,
  touchSnapshot,
} from "./repository";
import type { JsonObject } from "./types";

function errorMessage(error: unknown): string {
  if (error instanceof ApifyNotConfiguredError) {
    return "APIFY_API_TOKEN belum dikonfigurasi di server.";
  }

  if (error instanceof ApifyApiError) {
    return `Apify API gagal (${error.status}): ${error.message}`;
  }

  return error instanceof Error ? error.message : "Gagal memproses job Apify.";
}

async function failAndNotify(snapshotId: string, error: unknown): Promise<void> {
  const failed = await markSnapshotFailed({
    snapshotId,
    error: errorMessage(error),
  });
  await notifyApifySnapshot(failed);
}

export async function processQueuedApifySnapshots(
  client: ApifyClient = defaultApifyClient
): Promise<number> {
  const snapshots = await listQueuedSnapshots();

  for (const snapshot of snapshots) {
    try {
      const run = await client.startActorRun(
        snapshot.actorId,
        snapshot.actorInput as JsonObject
      );
      await markSnapshotRunning({
        snapshotId: snapshot.id,
        apifyRunId: run.id,
        apifyDatasetId: run.defaultDatasetId,
      });
    } catch (error) {
      await failAndNotify(snapshot.id, error);
    }
  }

  return snapshots.length;
}

export async function processRunningApifySnapshots(
  client: ApifyClient = defaultApifyClient
): Promise<number> {
  const snapshots = await listRunningSnapshots();

  for (const snapshot of snapshots) {
    try {
      if (!snapshot.apifyRunId) {
        throw new Error("Snapshot tidak memiliki Apify run ID.");
      }

      const run = await client.getActorRun(snapshot.apifyRunId);

      if (
        !(APIFY_TERMINAL_RUN_STATUSES as readonly string[]).includes(run.status)
      ) {
        await touchSnapshot(snapshot.id);
        continue;
      }

      if (
        (APIFY_FAILED_RUN_STATUSES as readonly string[]).includes(run.status)
      ) {
        throw new Error(`Run Apify selesai dengan status ${run.status}.`);
      }

      const datasetId = run.defaultDatasetId ?? snapshot.apifyDatasetId;

      if (!datasetId) {
        throw new Error("Run Apify tidak menghasilkan dataset ID.");
      }

      const items = await client.getDatasetItems(datasetId);
      const completed = await markSnapshotCompleted({
        snapshotId: snapshot.id,
        apifyDatasetId: datasetId,
        items,
      });
      await notifyApifySnapshot(completed);
    } catch (error) {
      await failAndNotify(snapshot.id, error);
    }
  }

  return snapshots.length;
}

export async function runApifyWorkerOnce(
  client: ApifyClient = defaultApifyClient
): Promise<{ queued: number; running: number }> {
  const queued = await processQueuedApifySnapshots(client);
  const running = await processRunningApifySnapshots(client);

  return { queued, running };
}
