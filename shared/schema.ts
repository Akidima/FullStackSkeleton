import { pgTable, text, serial, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with improved indexing
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  googleIdIdx: index("google_id_idx").on(table.googleId),
}));

// Define users relations
export const usersRelations = relations(users, ({ many }) => ({
  meetings: many(meetings),
}));

// Meetings table with improved indexing and relations
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
  participants: text("participants").array(),
  agenda: text("agenda"),
  notes: text("notes"),
  isCompleted: boolean("is_completed").notNull().default(false),
  summary: text("summary"),
  userId: serial("user_id").references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  dateIdx: index("date_idx").on(table.date),
  userIdIdx: index("user_id_idx").on(table.userId),
}));

// Define meetings relations
export const meetingsRelations = relations(meetings, ({ one }) => ({
  user: one(users, {
    fields: [meetings.userId],
    references: [users.id],
  }),
}));

// Tasks table with improved indexing and relations
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  completed: boolean("completed").notNull().default(false),
  userId: serial("user_id").references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  userIdIdx: index("tasks_user_id_idx").on(table.userId),
  completedIdx: index("completed_idx").on(table.completed),
}));

// Define tasks relations
export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

// Schema validation
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const updateTaskSchema = createInsertSchema(tasks).partial();
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const updateUserSchema = createInsertSchema(users).partial();
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true });
export const updateMeetingSchema = createInsertSchema(meetings).partial();

// Types
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;