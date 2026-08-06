import type { UserContext } from "@/lib/ai/roles/types";
import { listGroupsPageForUser } from "@/lib/integrations/whatsapp-inbox/directory/repository";
import { getUserInstance } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

import type { ListWhatsappGroupsInput } from "./schema";
import type { ListWhatsappGroupsToolResult } from "./types";

export async function executeListWhatsappGroups(
  input: ListWhatsappGroupsInput,
  ctx: { user: UserContext }
): Promise<ListWhatsappGroupsToolResult> {
  const instance = await getUserInstance(ctx.user.userId);

  if (instance.status !== "connected") {
    return {
      success: false,
      message:
        "WhatsApp pribadi belum terhubung. Hubungkan di Settings → Integrations.",
    };
  }

  const page = await listGroupsPageForUser(ctx.user.userId, {
    query: input.query,
    limit: input.limit,
    offset: input.offset,
  });

  return {
    success: true,
    data: {
      connected: true,
      directorySyncedAt: instance.directorySyncedAt,
      totalCount: page.totalCount,
      limit: page.limit,
      offset: page.offset,
      hasMore: page.hasMore,
      groups: page.items,
    },
  };
}
