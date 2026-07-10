import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const CHAT_KINDS = ["channel", "conversation"] as const;
export type ChatKind = (typeof CHAT_KINDS)[number];

export const WHATSAPP_CHANNEL_STATUSES = [
  "disconnected",
  "pairing",
  "connected",
] as const;
export type WhatsAppChannelStatus = (typeof WHATSAPP_CHANNEL_STATUSES)[number];

export const USER_GENDERS = ["laki_laki", "perempuan"] as const;
export type UserGender = (typeof USER_GENDERS)[number];

export const TODO_STATUSES = [
  "todo",
  "in_progress",
  "waiting",
  "done",
] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export const APIFY_SOCIAL_PLATFORMS = [
  "tiktok",
  "twitter",
  "threads",
] as const;
export type ApifySocialPlatform = (typeof APIFY_SOCIAL_PLATFORMS)[number];

export const APIFY_SOCIAL_SNAPSHOT_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;
export type ApifySocialSnapshotStatus =
  (typeof APIFY_SOCIAL_SNAPSHOT_STATUSES)[number];

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    role: varchar("role", { length: 32 }).notNull().default("client"),
    whatsappPhoneE164: varchar("whatsapp_phone_e164", { length: 20 }),
    gender: varchar("gender", { length: 16 }).notNull().default("laki_laki"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_whatsapp_phone_e164_idx").on(table.whatsappPhoneE164),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sessions_token_hash_idx").on(table.tokenHash)]
);

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull().default("conversation"),
    title: varchar("title", { length: 255 }).notNull().default("New chat"),
    contextSummary: text("context_summary"),
    summarizedUpToSequence: integer("summarized_up_to_sequence")
      .notNull()
      .default(-1),
    summaryUpdatedAt: timestamp("summary_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chats_user_id_updated_at_idx").on(table.userId, table.updatedAt),
    uniqueIndex("chats_user_channel_idx")
      .on(table.userId)
      .where(sql`${table.kind} = 'channel'`),
  ]
);

export const whatsappChannelConfig = pgTable("whatsapp_channel_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelPhoneE164: varchar("channel_phone_e164", { length: 20 }),
  status: varchar("status", { length: 32 })
    .notNull()
    .default("disconnected"),
  instanceName: varchar("instance_name", { length: 128 }).notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable(
  "messages",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull(),
    parts: jsonb("parts").notNull(),
    metadata: jsonb("metadata"),
    sequence: integer("sequence").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_chat_id_sequence_idx").on(table.chatId, table.sequence),
  ]
);

export const userIntegrations = pgTable(
  "user_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    credentialsEncrypted: text("credentials_encrypted").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("connected"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_integrations_user_provider_idx").on(
      table.userId,
      table.provider
    ),
  ]
);

export const scheduledJobs = pgTable(
  "scheduled_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id").references(() => chats.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    prompt: text("prompt").notNull(),
    scheduleKind: varchar("schedule_kind", { length: 16 }).notNull(),
    cronExpression: varchar("cron_expression", { length: 128 }),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Jakarta"),
    runAt: timestamp("run_at", { withTimezone: true }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    runCount: integer("run_count").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("scheduled_jobs_user_id_status_idx").on(table.userId, table.status),
    index("scheduled_jobs_status_updated_at_idx").on(table.status, table.updatedAt),
  ]
);

export const apifySocialSnapshots = pgTable(
  "apify_social_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id").references(() => chats.id, { onDelete: "set null" }),
    platform: varchar("platform", { length: 32 }).notNull(),
    actorId: varchar("actor_id", { length: 128 }).notNull(),
    queryHash: varchar("query_hash", { length: 64 }).notNull(),
    normalizedInput: jsonb("normalized_input").notNull(),
    actorInput: jsonb("actor_input").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    apifyRunId: varchar("apify_run_id", { length: 128 }),
    apifyDatasetId: varchar("apify_dataset_id", { length: 128 }),
    items: jsonb("items"),
    itemCount: integer("item_count").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("apify_social_snapshots_user_hash_idx").on(
      table.userId,
      table.platform,
      table.queryHash
    ),
    index("apify_social_snapshots_status_updated_at_idx").on(
      table.status,
      table.updatedAt
    ),
    index("apify_social_snapshots_user_status_idx").on(
      table.userId,
      table.status
    ),
  ]
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    tokenPrefix: varchar("token_prefix", { length: 16 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("api_keys_token_hash_idx").on(table.tokenHash),
    index("api_keys_user_id_idx").on(table.userId),
  ]
);

export const TODO_CODE_PREFIX = "TODO" as const;

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 32 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    project: varchar("project", { length: 128 }),
    status: varchar("status", { length: 32 }).notNull().default("todo"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("todos_user_id_code_idx").on(table.userId, table.code),
    index("todos_user_id_status_idx").on(table.userId, table.status),
    index("todos_user_id_position_idx").on(table.userId, table.position),
    index("todos_user_id_project_idx").on(table.userId, table.project),
  ]
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type UserIntegration = typeof userIntegrations.$inferSelect;
export type WhatsAppChannelConfig = typeof whatsappChannelConfig.$inferSelect;
export type Todo = typeof todos.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApifySocialSnapshot = typeof apifySocialSnapshots.$inferSelect;
