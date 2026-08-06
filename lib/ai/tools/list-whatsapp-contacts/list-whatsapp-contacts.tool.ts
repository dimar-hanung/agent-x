import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeListWhatsappContacts } from "./execute";
import { listWhatsappContactsInputSchema } from "./schema";

export function createListWhatsappContactsTool(user: UserContext) {
  return tool({
    description:
      "List the user's saved WhatsApp address-book contacts from the last directory sync (paginated). Supports optional query filter and offset for next pages. Not the same as chat threads. Always list every contact returned; use hasMore/totalCount to offer the next page.",
    inputSchema: listWhatsappContactsInputSchema,
    execute: (input) => executeListWhatsappContacts(input, { user }),
  });
}
