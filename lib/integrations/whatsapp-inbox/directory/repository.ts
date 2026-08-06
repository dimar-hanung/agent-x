import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { whatsappContacts, whatsappGroups } from "@/lib/db/schema";

export interface WhatsAppContactListItem {
  id: string;
  contactJid: string;
  displayName: string;
  phoneE164: string | null;
}

export interface WhatsAppGroupListItem {
  id: string;
  groupJid: string;
  displayName: string;
  participantCount: number | null;
}

export interface WhatsAppDirectoryListOptions {
  query?: string;
  limit?: number;
  offset?: number;
}

export interface WhatsAppDirectoryPage<T> {
  items: T[];
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

function resolvePagination(options?: WhatsAppDirectoryListOptions) {
  const limit = Math.min(
    Math.max(options?.limit ?? DEFAULT_PAGE_LIMIT, 1),
    MAX_PAGE_LIMIT
  );
  const offset = Math.max(options?.offset ?? 0, 0);
  const query = options?.query?.trim() ?? "";
  return { limit, offset, query };
}

export async function listContactsForUser(
  userId: string
): Promise<WhatsAppContactListItem[]> {
  return db
    .select({
      id: whatsappContacts.id,
      contactJid: whatsappContacts.contactJid,
      displayName: whatsappContacts.displayName,
      phoneE164: whatsappContacts.phoneE164,
    })
    .from(whatsappContacts)
    .where(eq(whatsappContacts.userId, userId))
    .orderBy(asc(whatsappContacts.displayName));
}

export async function listContactsPageForUser(
  userId: string,
  options?: WhatsAppDirectoryListOptions
): Promise<WhatsAppDirectoryPage<WhatsAppContactListItem>> {
  const { limit, offset, query } = resolvePagination(options);

  const filters: SQL[] = [eq(whatsappContacts.userId, userId)];
  if (query) {
    const pattern = `%${query}%`;
    filters.push(
      or(
        ilike(whatsappContacts.displayName, pattern),
        ilike(whatsappContacts.contactJid, pattern),
        ilike(whatsappContacts.phoneE164, pattern)
      )!
    );
  }

  const whereClause = and(...filters);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(whatsappContacts)
    .where(whereClause);

  const items = await db
    .select({
      id: whatsappContacts.id,
      contactJid: whatsappContacts.contactJid,
      displayName: whatsappContacts.displayName,
      phoneE164: whatsappContacts.phoneE164,
    })
    .from(whatsappContacts)
    .where(whereClause)
    .orderBy(asc(whatsappContacts.displayName))
    .limit(limit)
    .offset(offset);

  const totalCount = countRow?.count ?? 0;

  return {
    items,
    totalCount,
    limit,
    offset,
    hasMore: offset + items.length < totalCount,
  };
}

export async function listGroupsForUser(
  userId: string
): Promise<WhatsAppGroupListItem[]> {
  return db
    .select({
      id: whatsappGroups.id,
      groupJid: whatsappGroups.groupJid,
      displayName: whatsappGroups.displayName,
      participantCount: whatsappGroups.participantCount,
    })
    .from(whatsappGroups)
    .where(eq(whatsappGroups.userId, userId))
    .orderBy(asc(whatsappGroups.displayName));
}

export async function listGroupsPageForUser(
  userId: string,
  options?: WhatsAppDirectoryListOptions
): Promise<WhatsAppDirectoryPage<WhatsAppGroupListItem>> {
  const { limit, offset, query } = resolvePagination(options);

  const filters: SQL[] = [eq(whatsappGroups.userId, userId)];
  if (query) {
    const pattern = `%${query}%`;
    filters.push(
      or(
        ilike(whatsappGroups.displayName, pattern),
        ilike(whatsappGroups.groupJid, pattern)
      )!
    );
  }

  const whereClause = and(...filters);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(whatsappGroups)
    .where(whereClause);

  const items = await db
    .select({
      id: whatsappGroups.id,
      groupJid: whatsappGroups.groupJid,
      displayName: whatsappGroups.displayName,
      participantCount: whatsappGroups.participantCount,
    })
    .from(whatsappGroups)
    .where(whereClause)
    .orderBy(asc(whatsappGroups.displayName))
    .limit(limit)
    .offset(offset);

  const totalCount = countRow?.count ?? 0;

  return {
    items,
    totalCount,
    limit,
    offset,
    hasMore: offset + items.length < totalCount,
  };
}
