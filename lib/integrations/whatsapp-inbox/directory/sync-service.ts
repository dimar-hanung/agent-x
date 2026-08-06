import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  whatsappContacts,
  whatsappGroups,
  whatsappUserInstances,
} from "@/lib/db/schema";
import { getWhatsAppProvider } from "@/lib/integrations/whatsapp/factory";
import { isEvolutionConfigured } from "@/lib/integrations/whatsapp/env";
import { getUserInstanceRow } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

export interface WhatsAppDirectorySyncResult {
  contactsCount: number;
  groupsCount: number;
  directorySyncedAt: string;
}

export async function syncWhatsAppDirectory(
  userId: string
): Promise<WhatsAppDirectorySyncResult> {
  if (!isEvolutionConfigured()) {
    throw new Error("Evolution API belum dikonfigurasi.");
  }

  const row = await getUserInstanceRow(userId);

  if (row.status !== "connected") {
    throw new Error("WhatsApp pribadi belum terhubung.");
  }

  const provider = getWhatsAppProvider();
  const [contacts, groups] = await Promise.all([
    provider.findContacts(row.instanceName),
    provider.fetchAllGroups(row.instanceName),
  ]);

  const syncedAt = new Date();

  try {
    await db.transaction(async (tx) => {
      for (const contact of contacts) {
        await tx
          .insert(whatsappContacts)
          .values({
            userId,
            contactJid: contact.contactJid,
            displayName: contact.displayName,
            phoneE164: contact.phoneE164 ?? null,
          })
          .onConflictDoUpdate({
            target: [whatsappContacts.userId, whatsappContacts.contactJid],
            set: {
              displayName: contact.displayName,
              phoneE164: contact.phoneE164 ?? null,
              updatedAt: syncedAt,
            },
          });
      }

      for (const group of groups) {
        await tx
          .insert(whatsappGroups)
          .values({
            userId,
            groupJid: group.groupJid,
            displayName: group.displayName,
            participantCount: group.participantCount ?? null,
          })
          .onConflictDoUpdate({
            target: [whatsappGroups.userId, whatsappGroups.groupJid],
            set: {
              displayName: group.displayName,
              participantCount: group.participantCount ?? null,
              updatedAt: syncedAt,
            },
          });
      }

      await tx
        .update(whatsappUserInstances)
        .set({
          directorySyncedAt: syncedAt,
          updatedAt: syncedAt,
        })
        .where(eq(whatsappUserInstances.id, row.id));
    });
  } catch (error) {
    console.error("[whatsapp-directory] sync failed", error);
    throw error;
  }

  return {
    contactsCount: contacts.length,
    groupsCount: groups.length,
    directorySyncedAt: syncedAt.toISOString(),
  };
}
