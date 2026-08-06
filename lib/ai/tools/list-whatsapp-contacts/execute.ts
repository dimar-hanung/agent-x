import type { UserContext } from "@/lib/ai/roles/types";
import { listContactsPageForUser } from "@/lib/integrations/whatsapp-inbox/directory/repository";
import { getUserInstance } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

import type { ListWhatsappContactsInput } from "./schema";
import type { ListWhatsappContactsToolResult } from "./types";

export async function executeListWhatsappContacts(
  input: ListWhatsappContactsInput,
  ctx: { user: UserContext }
): Promise<ListWhatsappContactsToolResult> {
  const instance = await getUserInstance(ctx.user.userId);

  if (instance.status !== "connected") {
    return {
      success: false,
      message:
        "WhatsApp pribadi belum terhubung. Hubungkan di Settings → Integrations.",
    };
  }

  const page = await listContactsPageForUser(ctx.user.userId, {
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
      contacts: page.items,
    },
  };
}
