import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const history = sqliteTable("history", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  contentPreview: text("content_preview").notNull(),
  personaId: text("persona_id").notNull(),
  personaName: text("persona_name").notNull(),
  personaEmoji: text("persona_emoji").notNull(),
  commentCount: integer("comment_count").notNull(),
  comments: text("comments").notNull(),
  analysis: text("analysis").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
