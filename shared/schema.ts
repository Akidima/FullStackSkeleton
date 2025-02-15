import { pgTable, text, serial, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with improved indexing and verification fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional for Google OAuth users
  displayName: text("display_name").notNull(),
  profilePicture: text("profile_picture"),
  googleId: text("google_id"), // Make it nullable for email/password users
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationExpires: timestamp("verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  googleIdIdx: index("google_id_idx").on(table.googleId),
  verificationTokenIdx: index("verification_token_idx").on(table.verificationToken),
  passwordResetTokenIdx: index("password_reset_token_idx").on(table.passwordResetToken),
}));

export const usersRelations = relations(users, ({ many }) => ({
  meetings: many(meetings),
}));

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

export const meetingsRelations = relations(meetings, ({ one }) => ({
  user: one(users, {
    fields: [meetings.userId],
    references: [users.id],
  }),
}));

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

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users)
  .extend({
    email: z.string()
      .email("Please enter a valid email address")
      .min(1, "Email is required"),
    password: z.string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
      .refine((password) => {
        // Check for common patterns
        const commonPatterns = [
          /^password/i,
          /^12345/,
          /^qwerty/i,
          /^admin/i
        ];
        return !commonPatterns.some(pattern => pattern.test(password));
      }, "Password cannot contain common patterns")
      .optional(),
    displayName: z.string()
      .min(2, "Display name must be at least 2 characters long")
      .max(50, "Display name cannot exceed 50 characters"),
    isVerified: z.boolean().optional(),
    verificationToken: z.string().nullable().optional(),
    verificationExpires: z.date().nullable().optional(),
  })
  .omit({ id: true, createdAt: true });

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const updateUserSchema = createInsertSchema(users).partial();

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const updateTaskSchema = createInsertSchema(tasks).partial();
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true });
export const updateMeetingSchema = createInsertSchema(meetings).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;