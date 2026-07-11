import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";
import { getOrCreateMainChannel } from "@/lib/db/repositories/channel-repository";
import type {
  ApifySocialPlatform,
  ApifySocialSnapshot,
} from "@/lib/db/schema";

import { isApifyConfigured } from "./env";
import { buildPreviewItems, getSnapshotItems, platformLabel } from "./preview";
import {
  createQueuedSnapshot,
  findLatestCompletedSnapshot,
  findPendingSnapshot,
} from "./repository";
import type { ApifyToolData, PreparedApifyRequest } from "./types";

export interface SubmitApifySnapshotOptions {
  user: UserContext;
  runtimeContext?: ChatAgentRuntimeContext;
  request: PreparedApifyRequest;
  forceRefresh?: boolean;
}

function snapshotToToolData({
  snapshot,
  source,
  message,
}: {
  snapshot: ApifySocialSnapshot;
  source: ApifyToolData["source"];
  message: string;
}): ApifyToolData {
  const platform = snapshot.platform as ApifySocialPlatform;
  const items = getSnapshotItems(snapshot);

  return {
    source,
    platform,
    preview: buildPreviewItems(platform, items),
    message,
  };
}

export async function submitApifySnapshot({
  user,
  runtimeContext,
  request,
  forceRefresh = false,
}: SubmitApifySnapshotOptions): Promise<{
  success: boolean;
  code?: string;
  message?: string;
  data?: ApifyToolData;
}> {
  if (!forceRefresh) {
    const cached = await findLatestCompletedSnapshot({
      userId: user.userId,
      platform: request.platform,
      queryHash: request.queryHash,
    });

    if (cached) {
      return {
        success: true,
        data: snapshotToToolData({
          snapshot: cached,
          source: "cache",
          message: `Aku menemukan data ${platformLabel(request.platform)} yang sudah pernah dikumpulkan. Aku akan pakai data itu untuk menjawab lebih cepat.`,
        }),
      };
    }
  }

  const pending = await findPendingSnapshot({
    userId: user.userId,
    platform: request.platform,
    queryHash: request.queryHash,
  });

  if (pending) {
    const source = pending.status === "running" ? "running" : "queued";
    const label = platformLabel(request.platform);

    return {
      success: true,
      data: snapshotToToolData({
        snapshot: pending,
        source,
        message:
          source === "running"
            ? `Aku masih mengumpulkan dan menganalisis data ${label}. Ini mungkin butuh beberapa waktu, nanti hasilnya akan dikirim ke Kanal utama saat sudah siap.`
            : `Aku mulai mengumpulkan data ${label}. Prosesnya bisa butuh beberapa waktu, nanti hasilnya akan dikirim ke Kanal utama saat sudah siap.`,
      }),
    };
  }

  if (!isApifyConfigured()) {
    return {
      success: false,
      code: "APIFY_NOT_CONFIGURED",
      message:
        "Pengambilan data sosial media belum tersedia karena konfigurasi server belum lengkap.",
    };
  }

  const chatId =
    runtimeContext?.chatId ?? (await getOrCreateMainChannel(user.userId));
  const snapshot = await createQueuedSnapshot({
    userId: user.userId,
    chatId,
    platform: request.platform,
    actorId: request.actorId,
    queryHash: request.queryHash,
    normalizedInput: request.normalizedInput,
    actorInput: request.actorInput,
  });

  return {
    success: true,
    data: snapshotToToolData({
      snapshot,
      source: "queued",
      message: `Aku mulai mengumpulkan data ${platformLabel(request.platform)}. Prosesnya bisa butuh beberapa waktu, nanti hasilnya akan dikirim ke Kanal utama saat sudah siap.`,
    }),
  };
}
