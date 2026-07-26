import type { UserContext } from "@/lib/ai/roles/types";
import { generateDigest } from "@/lib/integrations/whatsapp-inbox/summary/service";

import type { SummarizeWhatsappDigestInput } from "./schema";
import type { SummarizeWhatsappDigestToolResult } from "./types";

export async function executeSummarizeWhatsappDigest(
  input: SummarizeWhatsappDigestInput,
  ctx: { user: UserContext }
): Promise<SummarizeWhatsappDigestToolResult> {
  const since = input.since ? new Date(input.since) : undefined;
  const result = await generateDigest(ctx.user.userId, { since });

  if ("success" in result && result.success === false) {
    return { success: false, message: result.message };
  }

  if ("success" in result) {
    return { success: false, message: "Gagal membuat ringkasan gabungan." };
  }

  return {
    success: true,
    data: result,
  };
}
