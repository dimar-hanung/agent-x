import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeListWhatsappGroups } from "./execute";
import { listWhatsappGroupsInputSchema } from "./schema";

export function createListWhatsappGroupsTool(user: UserContext) {
  return tool({
    description:
      "List WhatsApp groups the user belongs to from the last directory sync (paginated). Supports optional query filter and offset for next pages. Always list every group returned; use hasMore/totalCount to offer the next page.",
    inputSchema: listWhatsappGroupsInputSchema,
    execute: (input) => executeListWhatsappGroups(input, { user }),
  });
}
